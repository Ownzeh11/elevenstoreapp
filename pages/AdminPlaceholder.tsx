import React from 'react';
import { Shield, Hammer } from 'lucide-react';
import Card from '../components/ui/Card';

interface AdminPlaceholderProps {
    title: string;
    description: string;
}

const AdminPlaceholder: React.FC<AdminPlaceholderProps> = ({ title, description }) => {
    return (
        <div className="p-8 h-full flex items-center justify-center">
            <Card className="max-w-lg w-full p-12 text-center shadow-xl border-dashed border-2 border-indigo-100 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
                    <Shield className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-500 mb-8 text-lg">{description}</p>
                <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg font-medium">
                    <Hammer className="w-4 h-4" />
                    <span>Em Desenvolvimento</span>
                </div>
            </Card>
        </div>
    );
};

export default AdminPlaceholder;
