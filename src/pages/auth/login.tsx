
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AuthDataDto } from '@/types';
import { useAuth } from '@/context/auth.context';
import { useNavigate } from 'react-router-dom';

const loginSchema = z.object({
	email: z.string().email({ message: 'Invalid email address' }),
	password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export function AuthLoginPage() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ email: 'philippandrew.redondo@ustp.edu.ph', password: 'edusyncadmin69420' });
	const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
	const [submitting, setSubmitting] = useState(false);
	const auth = useAuth();

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		setForm({ ...form, [e.target.name]: e.target.value });
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const result = loginSchema.safeParse(form);
		if (!result.success) {
			const fieldErrors: { email?: string; password?: string } = {};
			for (const err of result.error.issues) {
				if (err.path[0] === 'email') fieldErrors.email = err.message;
				if (err.path[0] === 'password') fieldErrors.password = err.message;
			}
			setErrors(fieldErrors);
			return;
		}
		setErrors({});
		setSubmitting(true);

		try {
			const login = await fetch('https://cqi.ustp.edu.ph/dev/Api/Auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: result.data.email,
					password: result.data.password,
					rememberMe: true,
				}),
			});

			if (!login.ok) {
				alert('Login failed. Please check your credentials and try again.');
				return;
			}

			const data: AuthDataDto = await login.json();
			auth.setAuthData(data);
			const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
			document.cookie = `accessToken=${encodeURIComponent(data.accessToken)}; Path=/; Max-Age=2592000; SameSite=Lax${secureAttr}`;
			document.cookie = `refreshToken=${encodeURIComponent(data.refreshToken)}; Path=/; Max-Age=2592000; SameSite=Lax${secureAttr}`;
			localStorage.setItem('accessToken', data.accessToken);
			navigate('/dashboard');
		} catch (e) {
			console.log(e);
			alert('Unable to reach login server. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex items-center justify-center min-h-screen">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl text-center">Login</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								value={form.email}
								onChange={handleChange}
								autoComplete="email"
								disabled={submitting}
							/>
							{errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
						</div>
						<div className="space-y-1">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								value={form.password}
								onChange={handleChange}
								autoComplete="current-password"
								disabled={submitting}
							/>
							{errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
						</div>
						<Button type="submit" disabled={submitting} className="w-full">
							{submitting ? 'Logging in...' : 'Login'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}









