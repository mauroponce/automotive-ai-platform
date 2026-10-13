import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { db } from "@/lib/db";
export const authOptions: NextAuthOptions={adapter:PrismaAdapter(db),session:{strategy:"database"},providers:[CredentialsProvider({name:"Email and password",credentials:{email:{label:"Email",type:"email"},password:{label:"Password",type:"password"}},async authorize(credentials){if(!credentials?.email||!credentials.password)return null;const user=await db.user.findUnique({where:{email:credentials.email}});if(!user?.passwordHash||!await bcrypt.compare(credentials.password,user.passwordHash))return null;return {id:user.id,email:user.email,name:user.name};}})],pages:{signIn:"/login"}};
