# 서버(Supabase) 연결하기

주소와 키를 넣기 전까지 앱은 **체험판**(이 기기에만 저장)으로 동작한다.

## 1. 프로젝트 만들기
1. https://supabase.com → **New project**
2. Region: **Northeast Asia (Seoul)**, 데이터베이스 비밀번호는 따로 적어 둔다.

## 2. 표 만들기
1. 왼쪽 **SQL Editor** → **New query**
2. `supabase/migrations/0001_init.sql` 내용을 모두 붙여 넣고 **Run**

## 3. 로그인 메일을 "인증번호" 방식으로
1. **Authentication → Emails → Templates → Magic Link**
2. 본문을 아래처럼 바꾸고 저장 (`{{ .Token }}` 이 인증번호)

```html
<h2>Diet Design 인증번호</h2>
<p>앱에 아래 숫자를 입력해 주세요.</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>10분 안에 입력하지 않으면 다시 받아야 해요.</p>
```

3. 같은 내용을 **Confirm signup** 템플릿에도 넣는다 (처음 가입하는 사람에게는 이 메일이 간다).
4. **Authentication → Sign In / Providers → Email**: Email OTP Length 가 6 인지 확인.
5. **Authentication → URL Configuration → Site URL**: `https://diet-design.vercel.app`

> 기본 메일 발송은 시간당 몇 통으로 제한된다. 고객이 늘면 **Authentication → Emails → SMTP Settings**에 발송 서비스(예: Resend)를 연결한다.

## 4. Vercel에 주소와 키 넣기
1. Supabase **Project Settings → API**(또는 **Data API / API Keys**)에서
   - Project URL
   - anon public 키 (또는 publishable 키)
2. Vercel → diet-design 프로젝트 → **Settings → Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon 키
3. **Deployments → 최근 배포 ⋯ → Redeploy** (환경 변수는 다시 배포해야 적용된다)

## 5. 코치 계정 지정 (코치 화면이 생기기 전까지)
코치도 앱에서 한 번 로그인한 뒤, SQL Editor에서:

```sql
update profiles set role = 'coach' where id = (select id from auth.users where email = '코치 이메일');
update profiles set coach_id = (select id from auth.users where email = '코치 이메일')
  where id = (select id from auth.users where email = '고객 이메일');
```
