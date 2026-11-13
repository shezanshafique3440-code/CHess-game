export const authCopy = {
  en: {
    signIn: 'Sign in',
    register: 'Create account',
    guest: 'Play as guest',
    lobby: 'Lobby',
    local: 'Play locally',
    logout: 'Sign out',
    welcome: 'Your next chapter starts here.',
    registerTitle: 'A place at the board.',
    subtitle:
      'Sign in to your Sangat account or start a temporary guest session.',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    passwordHelp: '8–128 characters. Use a unique password.',
    usernameHelp:
      '3–24 letters, numbers or underscores. Guest names are reserved.',
    hasAccount: 'Already have an account?',
    noAccount: 'New to the club?',
    guestNote:
      'Guest accounts expire after 24 hours. No email or password needed.',
    localNote: 'Local chess works without signing in, including offline.',
    loading: 'Please wait…',
    language: 'اردو',
    back: 'Back to chess',
    lobbyTitle: 'Welcome to the club.',
    lobbySubtitle:
      'Your account is ready. Enjoy a local game while the club takes shape.',
    rating: 'Rating',
    member: 'Member',
    temporary: 'Guest account',
    expires: 'Session expires',
    profile: 'Your account',
    secured: 'Your session uses a secure, HttpOnly cookie.',
    checking: 'Checking your session…',
    VALIDATION_ERROR:
      'Check your details. Use a valid email, a 3–24 character username, and an 8–128 character password. Usernames may contain letters, numbers and underscores, and cannot start with guest_.',
    INVALID_CREDENTIALS: 'Email or password is incorrect.',
    ACCOUNT_EXISTS: 'That username or email is already registered.',
    RATE_LIMITED: 'Too many attempts. Please try again later.',
    UNAUTHENTICATED: 'Please sign in to continue.',
    SERVICE_UNAVAILABLE:
      'The server is unavailable. You can still play locally.',
    ORIGIN_NOT_ALLOWED: 'This app origin is not allowed by the server.',
    INVALID_JSON: 'Unable to submit the form. Please try again.',
    PAYLOAD_TOO_LARGE: 'The submitted data is too large.',
  },
  ur: {
    signIn: 'سائن اِن',
    register: 'اکاؤنٹ بنائیں',
    guest: 'مہمان بن کر کھیلیں',
    lobby: 'لابی',
    local: 'مقامی کھیل',
    logout: 'سائن آؤٹ',
    welcome: 'آپ کا اگلا سفر یہاں سے شروع ہوتا ہے۔',
    registerTitle: 'بساط پر آپ کی جگہ۔',
    subtitle: 'سنگت اکاؤنٹ میں سائن اِن کریں یا عارضی مہمان بنیں۔',
    username: 'صارف نام',
    email: 'ای میل',
    password: 'پاس ورڈ',
    passwordHelp: '۸ سے ۱۲۸ حروف۔ منفرد پاس ورڈ استعمال کریں۔',
    usernameHelp:
      '۳ سے ۲۴ انگریزی حروف، اعداد یا انڈر اسکور۔ مہمانوں کے نام محفوظ ہیں۔',
    hasAccount: 'پہلے سے اکاؤنٹ ہے؟',
    noAccount: 'کلب میں نئے ہیں؟',
    guestNote:
      'مہمان اکاؤنٹ ۲۴ گھنٹے بعد ختم ہو جاتا ہے۔ ای میل یا پاس ورڈ ضروری نہیں۔',
    localNote: 'بغیر سائن اِن اور آف لائن بھی مقامی شطرنج کھیل سکتے ہیں۔',
    loading: 'انتظار کریں…',
    language: 'English',
    back: 'شطرنج پر واپس',
    lobbyTitle: 'کلب میں خوش آمدید۔',
    lobbySubtitle: 'آپ کا اکاؤنٹ تیار ہے۔ ابھی مقامی کھیل سے لطف اٹھائیں۔',
    rating: 'ریٹنگ',
    member: 'رکن',
    temporary: 'مہمان اکاؤنٹ',
    expires: 'سیشن کی میعاد',
    profile: 'آپ کا اکاؤنٹ',
    secured: 'آپ کا سیشن محفوظ HttpOnly کوکی استعمال کرتا ہے۔',
    checking: 'سیشن کی جانچ ہو رہی ہے…',
    VALIDATION_ERROR:
      'درست ای میل، ۳ سے ۲۴ حروف کا صارف نام اور ۸ سے ۱۲۸ حروف کا پاس ورڈ درج کریں۔ صارف نام میں انگریزی حروف، اعداد یا انڈر اسکور ہوں اور ابتدا guest_ سے نہ ہو۔',
    INVALID_CREDENTIALS: 'ای میل یا پاس ورڈ درست نہیں۔',
    ACCOUNT_EXISTS: 'یہ صارف نام یا ای میل پہلے سے موجود ہے۔',
    RATE_LIMITED: 'بہت زیادہ کوششیں۔ کچھ دیر بعد دوبارہ آزمائیں۔',
    UNAUTHENTICATED: 'جاری رکھنے کے لیے سائن اِن کریں۔',
    SERVICE_UNAVAILABLE: 'سرور دستیاب نہیں۔ مقامی کھیل اب بھی کھیل سکتے ہیں۔',
    ORIGIN_NOT_ALLOWED: 'سرور اس ایپ کے پتے کی اجازت نہیں دیتا۔',
    INVALID_JSON: 'فارم نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔',
    PAYLOAD_TOO_LARGE: 'بھیجی گئی معلومات بہت زیادہ ہیں۔',
  },
};
export type AuthCopy = typeof authCopy.en;
export type AuthError =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_EXISTS'
  | 'RATE_LIMITED'
  | 'UNAUTHENTICATED'
  | 'SERVICE_UNAVAILABLE'
  | 'ORIGIN_NOT_ALLOWED'
  | 'INVALID_JSON'
  | 'PAYLOAD_TOO_LARGE';
