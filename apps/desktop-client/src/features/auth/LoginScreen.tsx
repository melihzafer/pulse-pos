import React, { useState, useRef } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@pulse/core-logic';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LoginDebug } from './LoginDebug';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('📝 Login form submitted:', { username, pinLength: pin.length });

    if (!username.trim()) {
      setError(t('auth.usernameRequired', 'Username is required'));
      return;
    }

    if (!pin.trim()) {
      setError(t('auth.pinRequired', 'PIN is required'));
      return;
    }

    if (pin.length < 4 || pin.length > 6) {
      setError(t('auth.pinLength', 'PIN must be 4-6 digits'));
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setError(t('auth.pinDigitsOnly', 'PIN must contain only digits'));
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Calling login function...');
      const success = await login(username, pin);
      console.log('🎯 Login result:', success);
      
      if (!success) {
        setError(t('auth.invalidCredentials', 'Invalid username or PIN'));
        setPin('');
        toast.error(t('auth.invalidCredentials', 'Invalid username or PIN'));
      } else {
        toast.success(t('auth.loginSuccess', 'Login successful'));
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(t('auth.loginError', 'Login failed. Please try again.'));
      toast.error(t('auth.loginError', 'Login failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setPin(value);
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel p-8 rounded-2xl shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 rounded-2xl shadow-lg flex items-center justify-center">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-cyan-900 dark:from-white dark:via-blue-100 dark:to-cyan-100 bg-clip-text text-transparent mb-2">
              {t('auth.welcome', 'Welcome to Pulse POS')}
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              {t('auth.loginPrompt', 'Sign in to continue')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('auth.username', 'Username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && username.trim()) {
                      e.preventDefault();
                      pinInputRef.current?.focus();
                    }
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder={t('auth.enterUsername', 'Enter your username')}
                  autoComplete="username"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* PIN Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('auth.pin', 'PIN Code')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={pin}
                  onChange={handlePinChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 text-2xl tracking-widest text-center"
                  placeholder="••••••"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t('auth.pinHelp', '4-6 digit PIN code')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !pin}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('auth.signingIn', 'Signing in...')}
                </span>
              ) : (
                t('auth.signIn', 'Sign In')
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
            {t('auth.contactAdmin', 'Need help? Contact your administrator')}
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <LoginDebug />
    </div>
  );
};
