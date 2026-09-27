import { useEffect } from 'react';
import { supabase } from './supabaseClient';

const SESSION_DURATION_MS = 60 * 60 * 1000;

function sessionStorageKey(role) {
    return `coffeePos${role}SessionStartedAt`;
}

export function startAuthSession(role) {
    localStorage.setItem(sessionStorageKey(role), String(Date.now()));
}

export function clearAuthSession(role) {
    localStorage.removeItem(sessionStorageKey(role));
}

export function useAuthSessionTimeout(role, navigate) {
    useEffect(() => {
        let expired = false;
        const storageKey = sessionStorageKey(role);
        const loginPath = `/${role.toLowerCase()}/login`;
        const authFlag = role === 'Admin' ? 'isAdminAuthenticated' : 'isBaristaAuthenticated';

        const expireSession = async () => {
            if (expired) return;
            expired = true;
            clearInterval(intervalId);
            clearAuthSession(role);
            localStorage.removeItem(authFlag);
            try {
                if (supabase) {
                    const { error } = await supabase.auth.signOut();
                    if (error) throw error;
                }
            } catch (error) {
                console.error(`Unable to sign out expired ${role.toLowerCase()} session from Supabase.`, error);
            }
            navigate(loginPath, { replace: true, state: { sessionExpired: true } });
        };

        const checkSession = () => {
            const storedStartedAt = localStorage.getItem(storageKey);
            if (storedStartedAt === null) {
                if (localStorage.getItem(authFlag) === 'true') void expireSession();
                return;
            }
            const startedAt = Number(storedStartedAt);
            if (!Number.isFinite(startedAt) || startedAt <= 0 || Date.now() - startedAt >= SESSION_DURATION_MS) {
                void expireSession();
            }
        };

        const intervalId = setInterval(checkSession, 15_000);
        checkSession();
        window.addEventListener('focus', checkSession);
        document.addEventListener('visibilitychange', checkSession);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', checkSession);
            document.removeEventListener('visibilitychange', checkSession);
        };
    }, [role, navigate]);
}
