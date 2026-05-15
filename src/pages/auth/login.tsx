
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

type LoginFormValues = z.infer<typeof loginSchema>;

function setAuthCookies(accessToken: string, refreshToken: string) {
	const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `accessToken=${encodeURIComponent(accessToken)}; Path=/; Max-Age=2592000; SameSite=Lax${secureAttr}`;
	document.cookie = `refreshToken=${encodeURIComponent(refreshToken)}; Path=/; Max-Age=2592000; SameSite=Lax${secureAttr}`;
}

export function AuthLoginPage() {
	const navigate = useNavigate();
	const auth = useAuth();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: 'philippandrew.redondo@ustp.edu.ph',
			password: 'edusyncadmin69420',
		},
	});

	const onSubmit = async (values: LoginFormValues) => {
		try {
			const login = await fetch('https://cqi.ustp.edu.ph/dev/Api/Auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: values.email,
					password: values.password,
					rememberMe: true,
				}),
			});

			if (!login.ok) {
				alert('Login failed. Please check your credentials and try again.');
				return;
			}

			const data: AuthDataDto = await login.json();
			auth.setAuthData(data);
			setAuthCookies(data.accessToken, data.refreshToken);
			localStorage.setItem('accessToken', data.accessToken);
			navigate('/dashboard');
		} catch (e) {
			console.log(e);
			alert('Unable to reach login server. Please try again.');
		}
	};

	return (
		<div className="flex items-center justify-center min-h-screen">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl text-center">Login</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-1">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								disabled={isSubmitting}
								{...register('email')}
							/>
							{errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
						</div>
						<div className="space-y-1">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								disabled={isSubmitting}
								{...register('password')}
							/>
							{errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
						</div>
						<Button type="submit" disabled={isSubmitting} className="w-full">
							{isSubmitting ? 'Logging in...' : 'Login'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}









