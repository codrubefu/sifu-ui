import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requestPasswordReset } from '../api/passwordResetApi';
import { ForgotPasswordView } from '../components/auth/ForgotPasswordView';
import { organizationConfigService } from '../services/OrganizationConfigService';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const organizationId = await organizationConfigService.getOrganizationIdForCurrentUrl();
      await requestPasswordReset({ email, organization_id: organizationId });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('passwordReset.forgotTitle'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ForgotPasswordView
      email={email}
      onChangeEmail={setEmail}
      onSubmit={() => void handleSubmit()}
      loading={loading}
      error={error}
      sent={sent}
    />
  );
}
