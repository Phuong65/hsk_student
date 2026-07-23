# API Architecture — HSK Admin

> Angular 17+ standalone app, JWT auth, HTTP signature, auto-pagination, interceptor-based error handling.

---

## 1. HTTP Stack

| Layer | Technology |
|---|---|
| Client | `@angular/common/http` `HttpClient` |
| Reactive | RxJS `Observable` |
| Auth | `@auth0/angular-jwt` (JWT helper) |
| Interceptor | Functional interceptor (`withInterceptors`) |
| File upload | `FormData` + `reportProgress: true` |

---

## 2. Environment & Deployment

### URL Construction

`DeploymentEnvironment` class (`src/environments/environment.model.ts`) takes `ApiServiceConfig` + `SocketServiceConfig`:

| Property | Pattern |
|---|---|
| `domain` | `{protocol}://{domainName}` |
| `url` | `{protocol}://{domainName}:{port}/` |
| `api` | `{protocol}://{domainName}:{port}/{realm}/api/` |
| `media` | `{protocol}://{domainName}:{port}/{realm}/api/uploads/` |
| `driverFile` | `{protocol}://{domainName}:{port}/{realm}/api/driver/` |
| `aws` | `{protocol}://{domainName}:{port}/{realm}/api/aws/` |
| `fileDir` | `{protocol}://{domainName}:{port}/folder/{realm}/` |

### Deployments (`src/environments/deployment.ts`)

| Name | domainName | port | realm | X_APP_ID |
|---|---|---|---|---|
| `server_dev` | `api-dev.ictu.vn` | 10091 | `hsk` | FA3D8DB6-... |
| `server_online` | `apps.ictu.edu.vn` | 9081 | `dacms` | 60A111A9-... |
| `ams.ictu.vn` | `apps.ictu.edu.vn` | 9081 | `dacms` | CA6CEDF4-... |

### Key exports (`src/environments/index.ts` → `@env`)

- `getApiRouteLink(route)` → `{api}{route}`
- `linkFileInfo`, `getLinkDownload`, `linkAwsInfo`, `linkGetFileContentAws`, `getLinkDriverStream`, `getHostDomain`
- `ENVIRONMENT`, `DEPLOYMENT_INFO`
- `ACCESS_TOKEN_KEY` (`__ocmI69Hl3avA`), `REFRESH_TOKEN_KEY` (`__ocmQk73vw6fp`)
- `USER_STORAGE_KEY`, `EMPLOYEE_STORAGE_KEY`

---

## 3. HTTP Interceptor

**File**: `src/app/interceptor/interceptor.ts`

Registered via `provideHttpClient(withInterceptors([httpInterceptor]))` in `app.config.ts`.

### Flow

1. **HTTP Signature** — calls `httpSignatureGenerator` to inject 3 headers:
   - `Authorization: Bearer {jwt}`
   - `X-APP-ID`: deployment's `X_APP_ID`
   - `x-request-signature`: CRC32(`requestBody + X_APP_ID + formattedDate`)

2. **Auto-pagination** — if response has `next` and `count === 1000`, recursively fetches all pages, concatenates data.

3. **401 handling**:
   - `"jwt expired"` + `remember_me` + refresh token → `RefreshTokenService.refreshToken()` → retry
   - `"unauthorized"` → navigate to login (other device logged in)

4. **Error mapping**: Server error codes → Vietnamese toast via `NotificationService`.

5. **408/403/0**: Status 0 = connection lost; 403 on refresh = session expired.

---

## 4. Authentication

**File**: `src/app/services/authentication.service.ts`

### Sign-in flow

1. POST `{api}login` (or `{api}login-google`) with credentials
2. Receive `Token { access_token, refresh_token }`
3. Store tokens in localStorage (`__ocmI69Hl3avA` / `__ocmQk73vw6fp`)
4. Fork 3 parallel requests:
   - GET `{api}profile` → user info
   - GET `{api}permission` → permissions
   - GET `{api}configs/` → app configs
5. Encrypt & store user/permission/configs in localStorage (AES/CryptoJS)

### Token Refresh

**File**: `src/app/services/refresh-token.service.ts`

- POST `{api}refresh-token` with `{ refresh_token }`
- Uses `sessionStorage` lock flag to prevent concurrent refresh calls
- Other callers subscribe to `onReceivingNewToken` Subject while refresh in-flight

### Session check

`JwtHelperService.isTokenExpired()` on access token.

### Logout

Clear all localStorage keys → navigate to `/auth/login`.

---

## 5. Base Service Class

**File**: `src/app/models/ictu-base-service.class.ts`

```typescript
class IctuBaseServiceClass<T> implements IctuBaseService<T>
```

Constructor takes `router` string → `this.api = "{apiUrl}{router}/"`.

| Method | HTTP | URL | Returns |
|---|---|---|---|
| `get(id, qp)` | GET | `{api}{id}` | `T` |
| `create(info)` | POST | `{api}` | `number` (ID) |
| `update(id, info)` | PUT | `{api}{id}` | `any` |
| `delete(id)` | DELETE | `{api}{id}` | `any` |
| `query(conditions, qp, subpath)` | GET | `{api}{subpath}` + query params | `DtoObject<T[]>` |

All domain services extend this class.

---

## 6. Service Endpoints

| Service | File | API Route | Extends |
|---|---|---|---|
| `AuthenticationService` | `services/authentication.service.ts` | `login`, `login-google`, `profile`, `permission`, `avatar`, `forget-password`, `reset-password` | standalone |
| `RefreshTokenService` | `services/refresh-token.service.ts` | `refresh-token` | standalone |
| `UserService` | `services/user.service.ts` | `users` (+ `register`, `profile`, `users/roles`, `users/validate-*`) | `IctuBaseServiceClass<User>` |
| `CoursesService` | `services/bank.service.ts` | `banks` | `IctuBaseServiceClass<Bank>` |
| `BankQuestionService` | `services/bank-question.service.ts` | `bank-questions` | `IctuBaseServiceClass<BankQuestion>` |
| `ShiftService` | `services/shift.service.ts` | `shifts` (+ `sinhde/{id}`) | `IctuBaseServiceClass<Shift>` |
| `ShiftPeriodService` | `services/shift-period.service.ts` | `shift-periods` | `IctuBaseServiceClass<ShiftPeriod>` |
| `ShiftStudentService` | `services/shift-student.service.ts` | `shift-students` | `IctuBaseServiceClass<ShiftStudent>` |
| `StudentService` | `services/student.service.ts` | `students` | `IctuBaseServiceClass<Student>` |
| `RoleService` | `services/role.service.ts` | `roles` | `IctuBaseServiceClass<Role>` |
| `DonViService` | `services/don-vi.service.ts` | `donvi` | `IctuBaseServiceClass<Organization>` |
| `DepartmentsService` | `services/departments.service.ts` | `departments` | `IctuBaseServiceClass<Department>` |
| `OrganizationService` | `services/organization.service.ts` | `organizations` | `IctuBaseServiceClass<Organization>` |
| `EmployeesService` | `services/employees.service.ts` | `employees`, `employees/all`, `employees/profile`, `employees/check-email/{email}`, `users/{id}` | `IctuBaseServiceClass<Employee>` |
| `LocationService` | `services/location.service.ts` | `cities`, `districts`, `wards` | `IctuBaseServiceClass<Locations>` |
| `FormService` | `services/form.service.ts` | `forms` | `IctuBaseServiceClass<Form>` |
| `FormDetailService` | `services/form-detail.service.ts` | `form-details` | `IctuBaseServiceClass<FormDetail>` |
| `SysConfigsService` | `services/sys-configs.service.ts` | `configs/` | standalone |
| `IctuFileService` | `services/ictu-file.service.ts` | `aws`, `media` (file hosting) | standalone |
| `FileQueryService` | `services/file-query.service.ts` | `aws`, `media-folders` | standalone |
| `NotificationService` | `services/notification.service.ts` | `refresh-token` (internal) | standalone |

---

## 7. File Service

**File**: `src/app/services/ictu-file.service.ts`

Dual hosting (AWS / local media), determined by `DEPLOYMENT_INFO.fileHostingService` (currently `'aws'`).

| Operation | Method | URL |
|---|---|---|
| Upload | POST | `{awsApi}` or `{mediaApi}` with `FormData` |
| Download (progress) | GET | `{mediaApi}` with `reportProgress`, `observe: 'events'`, `responseType: 'blob'` |
| AWS download | POST → GET | `{awsApi}file/{idOrName}` → signed URL |
| PDF split | POST | `{api}media-pdf/{id}/split` |
| Folder CRUD | GET/POST/PUT/DELETE | `{awsApi}` |

`FileQueryService` provides file search + folder listing.

---

## 8. Data Transfer Objects

**File**: `src/app/models/dto.ts`

```typescript
interface Dto {
    draw: number;
    recordsTotal: number;
    recordsFiltered: number;
    data: any;
    count?: number;
    code?: string;
    message?: string;
    next?: number;
}

interface DtoObject<T> extends Dto { data: T; }
```

### Query mechanism

**Conditions** (`IctuConditionParam[]`):
```typescript
interface IctuConditionParam {
    conditionName: string;
    condition?: IctuQueryCondition;  // 'LIKE' | '=' | '>' | '>=' | '<' | '<=' | '<>' | '!=' | 'NOT LIKE'
    value: string;
    orWhere?: 'like' | 'andlike' | 'orlike' | 'in' | 'orin' | 'notin' | 'ornotin' | 'and' | 'or';
}
```

**Query params** (`IctuQueryParams`): `include`, `include_by`, `exclude`, `exclude_by`, `limit`, `offset`, `paged`, `orderby`, `order`, `groupby`, `pluck`, `select`, `first`, `with`, etc.

Conditions built into `HttpParams` via `paramsConditionBuilder`.

---

## 9. Key Models

| File | Model |
|---|---|
| `models/auth.ts` | `Token { access_token, refresh_token }`, `Permission`, `UserPermission { view, create, update, delete }` |
| `models/user.ts` | `User` extends `IctuBaseModel` |
| `models/ictu-base-model.ts` | `IctuBaseModel`: id, is_deleted, deleted_by, deleted_at, created_by, updated_by, created_at, updated_at |

---

## 10. Socket.IO

**Provider**: `src/app/providers/ionline-socket.provider.ts`

Socket URL: `ENVIRONMENT.deployment.socket.url` (e.g. `wss://api-dev.ictu.vn:10092`), path `/sso/socket`. Auth payload includes token + realm.

Both `AuthenticationService` and `IOnlineSocket` create socket connections.

---

## 11. DI Registration

**File**: `src/app/app.config.ts`

```typescript
provideHttpClient(withInterceptors([httpInterceptor]))
```

Providers: `APP_SIGNING_DATE`, `ICTU_HTTP_HEADER_PARAM_HANDLER`, `ICTU_HTTP_SIGNATURE_GENERATOR`, `APP_REDIRECT_LINKS`, `SAVER`.

---

## 12. Data Flow Diagram

```
HttpClient
    ↓
httpInterceptor
  ├─ httpSignatureGenerator → Authorization, X-APP-ID, x-request-signature
  ├─ auto-pagination (limit=1000 → fetch next)
  ├─ 401 → RefreshTokenService or redirect login
  └─ error mapping → NotificationService toasts
    ↓
Service Layer (IctuBaseServiceClass<T> or standalone)
  └─ CRUD: get, create, update, delete, query
    ↓
Backend: {protocol}://{domain}:{port}/{realm}/api/{route}
  Protocol: https
  Realm: "hsk" (dev) / "dacms" (prod)
  Domain: api-dev.ictu.vn / apps.ictu.edu.vn
  Port: 10091 / 9081
```

---

## 13. Key Observations

- **All API calls go through `HttpClient`** — no raw `fetch` or `axios`.
- **Interceptor handles auth, signature, pagination, errors** — services are thin wrappers.
- **Base service class** standardizes CRUD — new domain services just extend it with a route string.
- **Query system** is condition-based (`IctuConditionParam[]`), not RESTful filtering.
- **Dual file hosting** — AWS (current) or local media fallback.
- **Socket.IO** for real-time (separate port, path `/sso/socket`).
- **All data encrypted at rest** in localStorage via AES/CryptoJS.
- **Vietnamese i18n** for error messages and notifications.
