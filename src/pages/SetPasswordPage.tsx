import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/passwordResetApi';
import { SetPasswordView } from '../components/auth/SetPasswordView';
import { organizationConfigService } from '../services/OrganizationConfigService';

export default function SetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (password !== passwordConfirmation) {
      setError(t('passwordReset.mismatch'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const organizationId = await organizationConfigService.getOrganizationIdForCurrentUrl();
      await resetPassword({ email, organization_id: organizationId, token, password, password_confirmation: passwordConfirmation });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('passwordReset.setTitle'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SetPasswordView
      password={password}
      passwordConfirmation={passwordConfirmation}
      onChangePassword={setPassword}
      onChangePasswordConfirmation={setPasswordConfirmation}
      onSubmit={() => void handleSubmit()}
      loading={loading}
      error={error}
      success={success}
      invalidLink={!token || !email}
    />
  );
}
