/// <reference types="jest" />
import {
  backoffDelay,
  classify,
  clearOutbox,
  enqueue,
  flushOutbox,
  onDrained,
  onSettled,
  pendingOps,
  readOwned,
  registerHandler,
  resetOutboxForTests,
  setOutboxUser,
  waitForSync,
  writeOwned,
} from "@/lib/outbox";

jest.mock("@react-native-community/netinfo", () => require("@react-native-community/netinfo/jest/netinfo-mock.js"));

jest.mock("expo-sqlite/kv-store", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    store,
    default: {
      getItemSync: jest.fn((key: string) => store.get(key) ?? null),
      setItemSync: jest.fn((key: string, value: string) => void store.set(key, value)),
      removeItemSync: jest.fn((key: string) => store.delete(key)),
    },
  };
});

const store = (jest.requireMock("expo-sqlite/kv-store") as { store: Map<string, string> }).store;
const NETWORK = { message: "TypeError: Network request failed", code: "", status: 0 };

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Math, "random").mockReturnValue(0.5);
  store.clear();
  resetOutboxForTests();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("classify", () => {
  it("treats an already-saved row as done", () => {
    expect(classify({ code: "23505", status: 409, message: "duplicate key" })).toBe("done");
  });

  it("retries network failures, server errors and expired sessions", () => {
    expect(classify(new TypeError("Network request failed"))).toBe("retry");
    expect(classify(NETWORK)).toBe("retry");
    expect(classify({ code: "", status: 503, message: "unavailable" })).toBe("retry");
    expect(classify({ code: "PGRST301", status: 401, message: "JWT expired" })).toBe("retry");
    expect(classify({ code: "", status: 401, message: "jwt expired" })).toBe("retry");
    expect(classify({ code: "08006", message: "connection failure" })).toBe("retry");
  });

  it("drops what can never succeed", () => {
    expect(classify({ code: "42501", status: 403, message: "row-level security" })).toBe("drop");
    expect(classify({ code: "23503", status: 409, message: "foreign key" })).toBe("drop");
    expect(classify({ code: "22P02", status: 400, message: "invalid input" })).toBe("drop");
  });
});

describe("backoffDelay", () => {
  it("doubles from 2s, caps at 5 minutes, with ±20% jitter", () => {
    expect(backoffDelay(0, () => 0.5)).toBe(2000);
    expect(backoffDelay(3, () => 0.5)).toBe(16000);
    expect(backoffDelay(20, () => 0.5)).toBe(300000);
    expect(backoffDelay(0, () => 0)).toBe(1600);
    expect(backoffDelay(0, () => 1)).toBe(2400);
  });
});

describe("outbox", () => {
  it("waits for a signed-in owner, then sends in order", async () => {
    const sent: number[] = [];
    registerHandler<number>("t", async (value) => void sent.push(value));
    enqueue({ kind: "t", owner: "u1", payload: 1 });
    enqueue({ kind: "t", owner: "u1", payload: 2 });
    enqueue({ kind: "t", owner: "u1", payload: 3 });
    await flushOutbox();
    expect(sent).toEqual([]);
    setOutboxUser("u1");
    await flushOutbox();
    expect(sent).toEqual([1, 2, 3]);
    expect(pendingOps()).toHaveLength(0);
  });

  it("runs one flush at a time", async () => {
    setOutboxUser("u1");
    await flushOutbox();
    const gate = deferred();
    const handler = jest.fn(() => gate.promise);
    registerHandler("t", handler);
    enqueue({ kind: "t", owner: "u1", payload: null });
    const first = flushOutbox();
    const second = flushOutbox({ force: true });
    expect(handler).toHaveBeenCalledTimes(1);
    gate.resolve();
    await Promise.all([first, second]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(pendingOps()).toHaveLength(0);
  });

  it("backs off after a network failure and retries on the timer", async () => {
    setOutboxUser("u1");
    let calls = 0;
    registerHandler("t", async () => {
      calls += 1;
      if (calls === 1) throw NETWORK;
    });
    enqueue({ kind: "t", owner: "u1", payload: null });
    await flushOutbox();
    expect(calls).toBe(1);
    expect(pendingOps()[0]).toMatchObject({ attempts: 1, failures: 0 });

    await jest.advanceTimersByTimeAsync(1999);
    expect(calls).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(calls).toBe(2);
    expect(pendingOps()).toHaveLength(0);
  });

  it("blocks the ops behind a failing one", async () => {
    setOutboxUser("u1");
    const sent: string[] = [];
    registerHandler<string>("t", async (value) => {
      if (value === "a") throw NETWORK;
      sent.push(value);
    });
    enqueue({ kind: "t", owner: "u1", payload: "a" });
    enqueue({ kind: "t", owner: "u1", payload: "b" });
    await flushOutbox();
    expect(sent).toEqual([]);
    expect(pendingOps().map((op) => op.payload)).toEqual(["a", "b"]);
  });

  it("settles duplicates as done and rejected ops as dropped, then moves on", async () => {
    setOutboxUser("u1");
    const settled: string[] = [];
    onSettled((op, outcome) => settled.push(`${op.payload as string}:${outcome}`));
    registerHandler<string>("t", async (value) => {
      if (value === "dup") throw { code: "23505", status: 409, message: "duplicate" };
      if (value === "rls") throw { code: "42501", status: 403, message: "rls" };
    });
    enqueue({ kind: "t", owner: "u1", payload: "dup" });
    enqueue({ kind: "t", owner: "u1", payload: "rls" });
    enqueue({ kind: "t", owner: "u1", payload: "ok" });
    await flushOutbox();
    expect(settled).toEqual(["dup:done", "rls:drop", "ok:done"]);
    expect(pendingOps()).toHaveLength(0);
  });

  it("drops an op after more than 8 server failures", async () => {
    setOutboxUser("u1");
    const settled: string[] = [];
    onSettled((_, outcome) => settled.push(outcome));
    const handler = jest.fn(async () => {
      throw { code: "", status: 500, message: "boom" };
    });
    registerHandler("t", handler);
    enqueue({ kind: "t", owner: "u1", payload: null });
    await flushOutbox();
    for (let index = 0; index < 12; index++) await jest.advanceTimersByTimeAsync(300000);
    expect(handler).toHaveBeenCalledTimes(9);
    expect(settled).toEqual(["drop"]);
    expect(pendingOps()).toHaveLength(0);
  });

  it("never gives up on network failures alone", async () => {
    setOutboxUser("u1");
    const handler = jest.fn(async () => {
      throw NETWORK;
    });
    registerHandler("t", handler);
    enqueue({ kind: "t", owner: "u1", payload: null });
    await flushOutbox();
    for (let index = 0; index < 12; index++) await jest.advanceTimersByTimeAsync(300000);
    expect(handler.mock.calls.length).toBeGreaterThan(9);
    expect(pendingOps()).toHaveLength(1);
  });

  it("replaces a waiting op with the same dedupe key", () => {
    enqueue({ kind: "t", owner: "u1", payload: 1, dedupeKey: "k" });
    enqueue({ kind: "t", owner: "u1", payload: 2 });
    enqueue({ kind: "t", owner: "u1", payload: 3, dedupeKey: "k" });
    expect(pendingOps("u1").map((op) => op.payload)).toEqual([3, 2]);
  });

  it("only sends the signed-in account's ops and drops another account's on sign-in", async () => {
    const sent: string[] = [];
    registerHandler<string>("t", async (value) => void sent.push(value));
    enqueue({ kind: "t", owner: "u1", payload: "mine" });
    setOutboxUser("u1");
    await flushOutbox();
    setOutboxUser(null);
    enqueue({ kind: "t", owner: "u1", payload: "later" });
    writeOwned("snap:u1", { value: 1 });
    await flushOutbox();
    expect(sent).toEqual(["mine"]);
    expect(pendingOps("u1")).toHaveLength(1);

    setOutboxUser("u2");
    await flushOutbox();
    expect(sent).toEqual(["mine"]);
    expect(pendingOps("u1")).toHaveLength(0);
    expect(readOwned("snap:u1")).toBeNull();
  });

  it("keeps the queue across restarts", async () => {
    enqueue({ kind: "t", owner: "u1", payload: "saved" });
    await flushOutbox();
    resetOutboxForTests();
    expect(pendingOps("u1").map((op) => op.payload)).toEqual(["saved"]);
    const sent: string[] = [];
    registerHandler<string>("t", async (value) => void sent.push(value));
    setOutboxUser("u1");
    await flushOutbox();
    expect(sent).toEqual(["saved"]);
  });

  it("waits for kinds nobody registered yet without blocking the others", async () => {
    const sent: string[] = [];
    registerHandler<string>("known", async (value) => void sent.push(value));
    enqueue({ kind: "unknown", owner: "u1", payload: "x" });
    enqueue({ kind: "known", owner: "u1", payload: "y" });
    setOutboxUser("u1");
    await flushOutbox();
    expect(sent).toEqual(["y"]);
    expect(pendingOps().map((op) => op.kind)).toEqual(["unknown"]);
  });

  it("tells listeners when the queue drains", async () => {
    const drained = jest.fn();
    onDrained(drained);
    registerHandler("t", async () => undefined);
    setOutboxUser("u1");
    enqueue({ kind: "t", owner: "u1", payload: null });
    await flushOutbox();
    expect(drained).toHaveBeenCalledTimes(1);
  });

  it("waitForSync gives up after the timeout and reports what's left", async () => {
    registerHandler("t", () => new Promise<void>(() => undefined));
    setOutboxUser("u1");
    enqueue({ kind: "t", owner: "u1", payload: null });
    const left = waitForSync(5000);
    await jest.advanceTimersByTimeAsync(5000);
    await expect(left).resolves.toBe(1);
  });

  it("clear removes every op and the cached snapshots", () => {
    enqueue({ kind: "t", owner: "u1", payload: 1 });
    writeOwned("snap:a", { value: 1 });
    clearOutbox();
    expect(pendingOps("u1")).toHaveLength(0);
    expect(readOwned("snap:a")).toBeNull();
    resetOutboxForTests();
    expect(pendingOps("u1")).toHaveLength(0);
  });
});
