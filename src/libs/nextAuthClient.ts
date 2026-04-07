export async function signInUseAuth({redirectPath}) {
  const { signIn } = await import('next-auth/react');
  await signIn('google', {
    callbackUrl: redirectPath
  })
}

export async function createPortalLink(locale: string, userId: string) {
  const response = await fetch(`/${locale}/api/stripe/create-portal-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId
    })
  });
  const json = await response.json();
  if (json?.url) {
    window.location.href = json.url;
    return;
  }
  throw new Error(json?.msg || "Failed to open billing portal.");
}
