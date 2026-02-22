import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useToast } from '@/src/components/toast/ToastProvider';
import { useAuth } from '@/src/auth/useAuth';
import { BRAND_NAME_FULL, BRAND_SUBCOPY } from '@/src/ui/branding';
import { Button, Icon, Input, Label, Surface } from '@/src/ui/components';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isLoading, signInWithEmailPassword, signUpWithEmailPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Redirect href="/plan" />;
  }

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      showToast('이메일과 비밀번호를 입력하세요.', 'error');
      return;
    }

    setSubmitting(true);
    const error =
      mode === 'sign-in'
        ? await signInWithEmailPassword(trimmedEmail, password)
        : await signUpWithEmailPassword(trimmedEmail, password);
    setSubmitting(false);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    if (mode === 'sign-up') {
      showToast('회원가입이 완료되었습니다. 바로 로그인됩니다.', 'success');
    } else {
      showToast('로그인되었습니다.', 'success');
    }
    router.replace('/plan');
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}>
      <Surface className="mx-auto w-full max-w-[460px]">
        <View className="mb-2 gap-1">
          <Label className="text-xl font-semibold">{BRAND_NAME_FULL}</Label>
          <Label muted>{BRAND_SUBCOPY}</Label>
        </View>

        <View className="mb-2 flex-row gap-2">
          <Button
            label="로그인"
            variant={mode === 'sign-in' ? 'primary' : 'ghost'}
            iconLeft={<Icon name="check-circle" size={14} color={mode === 'sign-in' ? '#f2f4f8' : '#9aa1ae'} />}
            onPress={() => setMode('sign-in')}
          />
          <Button
            label="회원가입"
            variant={mode === 'sign-up' ? 'primary' : 'ghost'}
            iconLeft={<Icon name="plus" size={14} color={mode === 'sign-up' ? '#f2f4f8' : '#9aa1ae'} />}
            onPress={() => setMode('sign-up')}
          />
        </View>

        <Input
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          className="mb-2"
        />
        <Input
          secureTextEntry
          textContentType="password"
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          className="mb-2"
          onSubmitEditing={submit}
        />

        <Button
          label={mode === 'sign-in' ? '이메일 로그인' : '이메일로 가입'}
          variant="primary"
          iconLeft={<Icon name={mode === 'sign-in' ? 'check-circle' : 'plus'} size={14} color="#f2f4f8" />}
          onPress={submit}
          disabled={submitting || isLoading}
          full
        />
      </Surface>
    </ScrollView>
  );
}
