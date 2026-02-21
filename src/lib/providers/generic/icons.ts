import { IconComponent } from '../types';
import { User, Smartphone, Globe, Monitor, Cpu, Frame, MessageSquare, Box, Square, Database, File, Play, HelpCircle, Activity } from 'lucide-react';

export const getGenericIcon = (service: string, type: string, subtype?: string): IconComponent => {
    const normalizedService = service?.toLowerCase().replace(/\s+/g, '') || '';

    if (type === 'frame') return Frame;
    if (type === 'note' || type === 'annotation') return MessageSquare;

    if (type === 'generic') {
        const normalizedSubtype = subtype?.toLowerCase() || '';
        switch (normalizedSubtype) {
            case 'process': return Square;
            case 'database': return Database;
            case 'file': return File;
            case 'start-end': return Play;
            case 'decision': return HelpCircle;
            case 'actor': return User;
            default: return Activity;
        }
    }

    const serviceMap: Record<string, IconComponent> = {
        'user': User,
        'browser': Globe,
        'mobile': Smartphone,
        'client': Monitor,
        'iot-device': Cpu,
    };

    if (serviceMap[normalizedService]) {
        return serviceMap[normalizedService];
    }

    return Box;
};
