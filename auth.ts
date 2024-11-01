import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';

// getUser用于从数据库中查询用户
async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
        return user.rows[0];
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {  // 处理身份验证逻辑
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })  //与 Server Actions 类似，您可以使用 zod 在检查用户是否存在于数据库中之前验证电子邮件和密码
                    .safeParse(credentials);
                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;
                    const passwordsMatch = await bcrypt.compare(password, user.password);  // 验证密码是否正确
                    if (passwordsMatch) return user;  // 如果匹配了就阻止用户登陆
                }
                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});
