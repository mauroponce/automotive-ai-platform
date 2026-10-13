"use client";
import { signIn } from "next-auth/react";
export function GoogleLoginButton(){return <button className="button" onClick={()=>signIn("google",{callbackUrl:"/portal"})}>Continue with Google</button>}
