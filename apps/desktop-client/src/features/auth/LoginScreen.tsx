import React, { useState, useRef } from 'react';
import { Lock, User, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@pulse/core-logic';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LoginDebug } from './LoginDebug';

type LoginMode = 'pin' | 'password';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const { login, loginWithPassword } = useAuthStore();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('pin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('📝 Login form submitted:', { username, mode: loginMode });

    if (!username.trim()) {
      setError(t('auth.usernameRequired', 'Username is required'));
      return;
    }

    if (loginMode === 'pin') {
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
    } else {
      if (!password.trim()) {
        setError(t('auth.passwordRequired', 'Password is required'));
        return;
      }
    }

    setIsLoading(true);

    try {
      console.log('🚀 Calling login function...');
      const success = loginMode === 'pin' 
        ? await login(username, pin)
        : await loginWithPassword(username, password);
      console.log('🎯 Login result:', success);
      
      if (!success) {
        const errorMsg = loginMode === 'pin' 
          ? t('auth.invalidCredentials', 'Invalid username or PIN')
          : t('auth.invalidPassword', 'Invalid username or password');
        setError(errorMsg);
        if (loginMode === 'pin') setPin('');
        else setPassword('');
        toast.error(errorMsg);
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

  const toggleLoginMode = () => {
    setLoginMode(prev => prev === 'pin' ? 'password' : 'pin');
    setPin('');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50">
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

          {/* Login Mode Toggle */}
          <div className="flex mb-6 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLoginMode('pin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                loginMode === 'pin'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4 inline-block mr-2" />
              {t('auth.pinLogin', 'PIN Login')}
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                loginMode === 'password'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4 inline-block mr-2" />
              {t('auth.passwordLogin', 'Password')}
            </button>
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
                      if (loginMode === 'pin') pinInputRef.current?.focus();
                      else passwordInputRef.current?.focus();
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

            {/* PIN Input (conditional) */}
            {loginMode === 'pin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('auth.pin', 'PIN Code')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
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
            )}

            {/* Password Input (conditional) */}
            {loginMode === 'password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('auth.password', 'Password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder={t('auth.enterPassword', 'Enter your password')}
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

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
              disabled={isLoading || !username || (loginMode === 'pin' ? !pin : !password)}
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

          {/* Default Credentials Info (Development only) */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2">
              {t('auth.defaultCredentials', 'Default Admin Credentials')}:
            </p>
            <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <p>Username: <span className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">admin</span></p>
              <p>PIN: <span className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">1234</span></p>
              <p>Password: <span className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1 rounded">admin123</span></p>
            </div>
          </div>

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
