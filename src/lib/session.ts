import { getIronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";

declare module "iron-session" {
  interface IronSessionData {
    user?: {
      id: string;
      email: string;
      name: string;
    };
    pm?: {
      id: string;
      email: string;
    };
  }
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "pm-booking-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<IronSessionData>(cookieStore, sessionOptions);
}

export async function requireCustomer() {
  const session = await getSession();
  if (!session.user) throw new Error("UNAUTHENTICATED");
  return session.user;
}

export async function requirePM() {
  const session = await getSession();
  if (!session.pm) throw new Error("UNAUTHENTICATED_PM");
  return session.pm;
}
