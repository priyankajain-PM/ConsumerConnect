export async function sendPushNotification(params: {
  phone: string;
  pmId: string;
  magicLink: string;
}): Promise<void> {
  const res = await fetch("https://api.clevertap.com/1/send/push.json", {
    method: "POST",
    headers: {
      "X-CleverTap-Account-Id": process.env.CLEVERTAP_ACCOUNT_ID!,
      "X-CleverTap-Passcode": process.env.CLEVERTAP_PASSCODE!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: { WZRK_ID: [params.phone] },
      content: {
        body: "Our Product would like to connect with you.",
        platform_specific: {
          ios: { deep_link: params.magicLink },
          android: { deep_link: params.magicLink },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("CleverTap push failed:", res.status, text);
  }
}
