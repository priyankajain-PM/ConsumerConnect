export async function sendPushNotification(params: {
  phone: string;
  pmId: string;
  magicLink: string;
}): Promise<Record<string, unknown>> {
  const res = await fetch("https://eu1.api.clevertap.com/1/send/externaltrigger.json", {
    method: "POST",
    headers: {
      "X-CleverTap-Account-Id": process.env.CLEVERTAP_ACCOUNT_ID!,
      "X-CleverTap-Passcode": process.env.CLEVERTAP_PASSCODE!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: { identity: [params.phone] },
      campaign_id: "1777690602",
      ExternalTrigger: { deep_link: params.magicLink },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("CleverTap push failed:", res.status, data);
  } else {
    console.log("CleverTap push response:", data);
  }
  return data;
}
