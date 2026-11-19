import {NextResponse} from 'next/server';import {db} from '../../../lib/db';
export async function GET(){const [transactions,uploads,budgets,goals]=await Promise.all([db.transaction.findMany({orderBy:{date:'desc'}}),db.upload.findMany({include:{_count:{select:{links:true}}},orderBy:{createdAt:'desc'}}),db.budget.findMany(),db.goal.findMany()]);return NextResponse.json({transactions,uploads,budgets,goals});}

export const dynamic = "force-dynamic";
