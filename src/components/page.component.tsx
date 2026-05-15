import type React from 'react';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';


interface PageLayoutProps {
    title: string;
    description: string;
    children: React.ReactNode;
    showBackButton?: boolean;
    onBack?: () => void;
    backButtonLabel?: string;
    actions?: React.ReactNode;
}

export default function PageLayout({
    title = 'Title',
    description = 'Description',
    children,
    showBackButton = true,
    onBack,
    backButtonLabel = 'Back',
    actions,
}: PageLayoutProps): React.ReactNode {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-auto gap-4 w-full min-w-0 px-6 py-10">
            <div className="flex items-start justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                    {actions}
                    {showBackButton && (
                        <Button variant="outline" onClick={onBack ?? (() => navigate(-1))} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {backButtonLabel}
                        </Button>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}