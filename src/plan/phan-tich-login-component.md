# Phân tích Login Component & Cách chạy không cần Employee

## 1. Login Component

**Files**: `src/app/pages/auth/login/login.component.ts` (logic) + `.html` (template) + `.css` (style)

### Giao diện

**Background**: ảnh `images/background_login.jpg` phủ kín qua biến `--bg-grid`, overlay đen + `backdrop-filter: blur(4px)`

**Thẻ login**: class `.login-elegant__inner`, khung trắng bo 10px, `width: min(500px, calc(100vw - 30px))`, border `1px solid rgba(194,201,214,0.4)`, padding 40px, wrapper có `::before`/`::after` offset shadow

Các section từ trên xuống:

| # | Section | Nội dung |
|---|---------|----------|
| 1 | **Loading overlay** | `<app-loading-progress>` hiện khi `loading()` signal = true |
| 2 | **Heading** | `<h4>Đăng nhập</h4>` — không logo, không branding |
| 3 | **Form** | Username (label "Tài khoản", placeholder "Mã sinh viên hoặc email"), Password (label "Mật khẩu" + eye toggle `mat-icon`), Checkbox "Ghi nhớ đăng nhập" + link "Quên mật khẩu?", Nút "Đăng nhập" xanh #1652F0 kèm SVG lock icon (disabled khi invalid) |
| 4 | **SSO** | Separator "Đăng nhập bằng tài khoản liên kết" + nút Google + nút Microsoft (chỉ hiện khi config enable) |
| 5 | **Version** | `V${appVersion} ${currentUserTimeZone}` |

### Flow đăng nhập

Login component hỗ trợ 2 phương thức:

**1. Local (`signIn`)**:
```
signIn({username, password})
 → _signIn(signIn, 'LOCAL')
   → HTTP POST /api/login → Token {access_token, refresh_token}
   → startSession(token)
```

**2. Google One Tap (`googleSignIn`)**:
```
googleSignIn(credential)
 → _signIn(signIn, 'GOOGLE')
   → HTTP POST /api/login-google → Token
   → startSession(token)   // giống local
```

**`startSession(token)` chi tiết**:
```
1. saveToken (localStorage)
2. forkJoin:
     user:        this.loadUserInfo()         GET /api/profile
     permissions: this.loadUserPermissions()  GET /api/permission
     employee:    of(null)                    placeholder
     student:     of(null)                    placeholder
     configs:     sysConfigsService.getAppConfigs()
3. switchMap:
     nếu permissions.data.roles có role ∈ ARRAY_EMPLOYEE_ROLES
       → EmployeesService.getEmployeeInfo(user)  → employee thật
       ngược lại → employee: null
4. map: saveUser, savePermissions, saveEmployee(employee|null), saveStudent(null),
        saveConfigs, connectSocket, return true
```

**`redirectAfterAuthenticated()`**:
```
- fallbackUrl? → navigate đến fallbackUrl
  - nếu lỗi → không xử lý đặc biệt cho login path
- không fallbackUrl:
  - auth.maxPowerRoleUser() → APP_REDIRECT_LINKS.get(role.name) → navigate
    - nếu lỗi → navigate ['throw-error'] với queryParams {fallbackUrl, reason, time}
  - không role → navigate ['unauthorized'] với queryParams {time}
```

### Flow SSO (Third-party)

Login component dùng observer-based flow để tránh re-click:

```
btnSignInWithThirdPartyAccounts(source: 'google'|'microsoft')
  → signInWithThirdPartyObserver.next(source)   // Subject<SignInWithThirdParty>
    → pipe(debounceTime(200))
    → handleSignInWithThirdPartyAccounts(source):
        1. Tạo redirect URI: {origin}/auth/redirect-uri-call-back?redirect-uri-source={source}
        2. GET {api}/login-{source}?redirect_uri={encodedRedirectUri}
        3. Validate response.data bằng regex
        4. Hợp lệ → location.assign(url)  // trình duyệt redirect đến SSO provider
        5. Không hợp lệ → toastError("Định dạng đường dẫn đăng nhập không đúng")
        6. Lỗi HTTP → reset loading
```

**`RedirectUriCallbackComponent`** (`/auth/redirect-uri-call-back`):
```
States: 'checking' | 'loading' | 'invalid' | 'error' | 'success'

validateParams():
  - Kiểm tra redirect-uri-source ∈ SIGN_IN_WITH_THIRD_PARTY_VALUES
  - Kiểm tra code param
  - Hợp lệ → sendCode(code, source):
      1. POST {api}/login-{source} với {code, redirect_uri}
      2. switchMap → auth.startSession(token)
      3. Thành công → redirectAfterLoggedIn(500)
      4. 401 → "Mã xác thực đã hết hạn"
      5. 500 → "Máy chủ không phản hồi"
  - Không hợp lệ → redirect /auth/login
```

**File types**: `src/app/pages/auth/interfaces/sign-in-with-third-party.ts`
- `SIGN_IN_WITH_THIRD_PARTY_VALUES = ['microsoft', 'google']`
- `type SignInWithThirdParty = 'microsoft' | 'google'`
- `interface SignInWithThirdPartyResponse { code: number; data: string; message: string }`

### Route & Guards

**Top-level routes** (`app.routes.ts`):

| Path | Component/Module | Guard | Ghi chú |
|------|-----------------|-------|---------|
| `/auth` | AuthModule (lazy) | — | |
| `/admin` | AdminModule (lazy) | `adminGuard` | Check `userLoggedIn` + `userMenu.length > 0` |
| `/throw-error` | ThrowErrorComponent | — | Fallback khi redirect lỗi |
| `/unauthorized` | UnauthorizedComponent | — | |
| `/preview` | PreviewComponent + children | — | |
| `**` | redirectTo `/auth/login` | — | `pathMatch: 'full'` |

**Auth child routes** (`auth-routing.module.ts`):

| Path | Component | Ghi chú |
|------|-----------|---------|
| `login` | LoginComponent (default export) | Lazy `loadComponent` |
| `forgot-password` | ForgotPasswordComponent | |
| `reset-password` | ResetPasswordComponent | |
| `redirect-uri-call-back` | RedirectUriCallback (default export) | SSO callback |
| `unauthorized` | UnauthorizedComponent | |
| `**` | redirectTo `login` | `pathMatch: 'prefix'` |

**Guards khác**:

| Guard | File | Logic |
|-------|------|-------|
| `authGuard` | `guards/auth.guard.ts` | Check `userLoggedIn` → true : redirect `/auth/login?fallbackUrl=...` |
| `adminGuard` | `guards/admin.guard.ts` | Check `userLoggedIn` + `userMenu.length > 0` |
| `adminModuleGuard` | `guards/admin-module.guard.ts` | Check `state.url.startsWith('/admin/{nav.id}/')` |
| `adminModuleChildGuard` | `guards/admin-module-child.guard.ts` | Check child route tồn tại trong userMenu |
| `httpInterceptor` | `interceptor/interceptor.ts` | Sign request, 401 → refresh token, 403/404/0 → toast |

## 2. Mối quan hệ User vs Employee

**User** (`src/app/models/user.ts`): tài khoản — `id, username, display_name, email, avatar, donvi_id, role_ids, ...`

**Employee** (`src/app/models/employee.ts`): thông tin nhân sự — `full_name, code, gender, dob, academic_degree, positions, contract_status, ...`

| Đặc điểm | User | Employee |
|----------|------|----------|
| Bắt buộc? | ✅ Có | ❌ Không — optional |
| Load sau login? | ✅ Luôn (`GET /api/profile`) | ⚠️ **Có điều kiện**: nếu role ∈ `ARRAY_EMPLOYEE_ROLES` → `EmployeesService.getEmployeeInfo(user)`, ngược lại → `null` |
| Lưu storage | `USER_STORAGE_KEY` (mã hoá) | `EMPLOYEE_STORAGE_KEY` |
| Khi nào load | Luôn | Trong `startSession()`, `forkJoin` khởi tạo `of(null)`, `switchMap` sau đó kiểm tra role và gọi API nếu cần |

**Role nào cần Employee?** (`ARRAY_EMPLOYEE_ROLES`):
```
admin, ceo, teacher, teaching_assistant, training_management,
general_management, sales, accountant, supporter
```
Các role không cần: `student, parents, marketing, mod_media, mod_comments, management`

## 3. Cách chạy không cần Employee

**Trạng thái hiện tại: Đã hỗ trợ sẵn (có điều kiện).**

- `startSession()` không luôn gọi `saveEmployee(null)`. Employee được load nếu user có role trong `ARRAY_EMPLOYEE_ROLES`. Chỉ role ngoài mảng đó mới nhận `null`.
- Guards không kiểm tra employee (chỉ JWT + menus)
- Menus trong `admin-layout` lấy từ `auth.userMenu` — không phụ thuộc employee
- `info.component.ts` dùng `computed(() => !!this.auth.employee)` để ẩn/hiện section
- `info-form-employee.component.ts` dùng `auth.employee` để edit profile; nếu `null` thì ẩn

**Cách test/dev không employee**: tạo user backend với role không trong `ARRAY_EMPLOYEE_ROLES` (vd: `marketing`, `parents`, `student`, `mod_media`, `mod_comments`)

**Các file dùng employee (cần xử lý nếu muốn bỏ hoàn toàn)**:

| File | Cách dùng employee |
|------|-------------------|
| `services/authentication.service.ts` | Lưu/storage employee, inject `EmployeesService` |
| `pages/admin/children/account/children/info/info.component.ts` | `isEmployee = computed(() => !!auth.employee)` |
| `pages/admin/children/account/children/info-form-about-me.component.ts` | Load bio, social_media từ `auth.employee` |
| `pages/admin/children/account/children/info-form-employee/...` | Employee profile form |
| `components/employee-card.component.ts` | Hiển thị thông tin employee |
| `components/employee-picker.component.ts` | Picker chọn |
| `models/role.ts` | Định nghĩa `ARRAY_EMPLOYEE_ROLES` |

## 4. Files chính liên quan

| File | Vai trò |
|------|---------|
| `services/authentication.service.ts` | Authentication logic, session, token, localStorage |
| `services/employees.service.ts` | Employee API query |
| `services/refresh-token.service.ts` | Refresh token với concurrency guard (sessionStorage flag) |
| `guards/auth.guard.ts` | Redirect `/auth/login` nếu JWT expired, preserve fallbackUrl |
| `guards/admin.guard.ts` | Kiểm tra login + menus |
| `guards/admin-module.guard.ts` | Kiểm tra userMenu với URL admin module prefix |
| `guards/admin-module-child.guard.ts` | Kiểm tra child route trong userMenu |
| `guards/index.ts` | Barrel export: `adminGuard`, `adminModuleGuard`, `adminModuleChildGuard` |
| `interceptor/interceptor.ts` | `httpInterceptor` — sign request, 401 refresh token, 403/4xx/5xx error + toast |
| `pages/auth/auth-routing.module.ts` | Auth child routes (lazy `loadComponent`) |
| `pages/auth/interfaces/sign-in-with-third-party.ts` | Type `SignInWithThirdParty`, response interface |
| `pages/auth/redirect-uri-call-back/redirect-uri-call-back.ts` | SSO callback handler |
| `models/auth.ts` | Token, Permission types |
| `models/user.ts` | User interface |
| `models/employee.ts` | Employee interface |
| `models/role.ts` | SysRoleName, APP_REDIRECT_LINKS, ARRAY_EMPLOYEE_ROLES |
| `app.config.ts` | Providers: token, redirect links, HTTP signing, PrimeNG, animations, interceptor |
| `app.routes.ts` | Routing tổng (top-level routes) |
| `environments/environment.ts` | API endpoints, deployment config |

### Providers trong `app.config.ts`

| Provider | Mục đích |
|----------|----------|
| `provideAnimations()` | Angular animations |
| `provideZoneChangeDetection({eventCoalescing: true})` | Zone.js optimization |
| `provideRouter(routes)` | Router |
| `APP_SIGNING_DATE` | Format date cho HTTP signature (`'YYYY-MM-DD HH:mm:00'`) |
| `ICTU_HTTP_HEADER_PARAM_HANDLER` | Header param handler cho request signing |
| `ICTU_HTTP_SIGNATURE_GENERATOR` | `httpSignatureGenerator` — HMAC signing |
| `APP_REDIRECT_LINKS` + `createAppRedirectLinks` | Role → route mapping (InjectionToken factory) |
| `MatDialog` | Material dialog |
| `providePrimeNG(...)` | PrimeNG theme Aura, i18n tiếng Việt |
| `MessageService` | PrimeNG toast notifications |
| `provideHttpClient(withInterceptors([httpInterceptor]))` | HTTP client + interceptor pipeline |
| `SAVER` | File download utility |

Token helpers export từ `app.config.ts`: `tokenGetter()`, `tokenSetter()`, `deleteToken()` (access token), `refreshTokenGetter()`, `refreshTokenSetter()` (refresh token).
