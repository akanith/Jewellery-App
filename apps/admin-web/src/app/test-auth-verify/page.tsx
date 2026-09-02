import { redirect } from 'next/navigation';

export default function DeprecatedTestAuthVerifyPage() {
  redirect('/login/test');
}
