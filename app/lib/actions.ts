'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',  // 自定义错误信息
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',  // 自定义错误信息
    }),
    date: z.string(),
});

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

// create操作
const CreateInvoice = FormSchema.omit({ id: true, date: true });
// 从 form表单中提取数据
export async function createInvoice(prevState: State, formData: FormData) {  //prevState - 包含从 useActionState 钩子传递的状态。您不会在本示例的 action 中使用它，但它是必需的 prop。
    // export async function createInvoice(formData: FormData) {
    // 使用数据安全验证表单数据
    const validatedFields = CreateInvoice.safeParse({  // safeParse（） 将返回一个包含 success 或 error 字段的对象。这将有助于更优雅地处理验证，而无需将此 logic 放入 try/catch 块中。
        // const { customerId, amount, status } = CreateInvoice.parse({
        // const rawFormData = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    // 如果 validatedFields 不成功，我们会提前返回函数，并显示来自 Zod 的错误消息。
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
    // 使用安全数据写入数据库
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;  // 以 cents 存储值
    const date = new Date().toISOString().split('T')[0];  // 创建日期
    try {  // 使用try catch 捕获错误
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;  // 将数据插入数据库
    } catch (error) {
        return {
            message: "Database Error: Faild to Create Invoice",
        };
    }

    revalidatePath('/dashboard/invoices');  // 重新验证页面
    redirect('/dashboard/invoices');  //重定向回 /dashboard/invoices 页面

    // Test it out:
    // console.log(rawFormData);
    // console.log(typeof rawFormData.amount);  // amount 是 string类型
}

// update 操作
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(prevState: State, id: string, formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        // const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
        };
    }
    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = amount * 100;
    try {
        await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
    } catch (error) {
        return {
            message: "Database Error: Faild to Update Invoice",
        };
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

// delete 操作
export async function deleteInvoice(id: string) {
    // throw new Error('Failed to Delete Invoice');  // 用于测试错误捕获的功能。
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
        return { message: "Deleted Invoice" };
    } catch (error) {
        return {
            message: "Database Error: Faild to Delete Invoice",
        };
    }

}
