export async function signInUseAuth({redirectPath}) {
  const { signIn } = await import('next-auth/react');
  const result = await signIn('google', {
    callbackUrl: redirectPath
  })
}
