import { redirect } from 'next/navigation';

export default function DeprecatedVerifyAuthLinkingPage() {
  redirect('/login/test');
}
