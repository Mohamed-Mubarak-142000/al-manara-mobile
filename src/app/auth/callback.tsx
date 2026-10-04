import { Redirect } from "expo-router";

/**
 * Where Google sends the user back (almanara://auth/callback). The browser sheet hands the code to
 * signInWithGoogle(); if the system also opens this route, it simply goes home instead of "not found".
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
