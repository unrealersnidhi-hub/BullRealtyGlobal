

# Security Review: Bull Star Realty

## Executive Summary

Your project has **1 critical vulnerability**, **2 medium-severity issues**, and **several low-severity concerns** that should be addressed. The most significant finding is an overly permissive RLS policy on the leads table, and missing RLS policies that could impact functionality.

---

## Critical Issues

### 1. Overly Permissive RLS Policy on Leads Table

**Severity: CRITICAL**

**The Problem:**
The current RLS policy on the `leads` table allows anyone to insert data without restriction:

```sql
CREATE POLICY "Anyone can submit leads"
ON public.leads
FOR INSERT
WITH CHECK (true);
```

**Impact:**
- **Spam attacks**: Bots can flood your database with fake leads
- **Storage exhaustion**: Attackers could fill your database quota
- **Data pollution**: Real leads become buried under spam
- **No rate limiting**: Unlimited submissions per IP/session

**Recommendation:** Implement a rate-limited edge function to handle lead submissions instead of direct database inserts.

---

## Medium Severity Issues

### 2. CSV Injection Vulnerability in Export

**Severity: MEDIUM**

**The Problem:**
The CSV export function in `AdminDashboard.tsx` only escapes double quotes but doesn't protect against CSV injection:

```typescript
`"${lead.full_name.replace(/"/g, '""')}"`
```

A malicious user could submit a lead with a name like:
```
=cmd|'/C calc'!A0
```

When opened in Excel, this could execute commands.

**Fix:** Prefix cells starting with `=`, `+`, `-`, `@`, or tab/carriage return with a single quote.

---

### 3. Leaked Password Protection Disabled

**Severity: MEDIUM**

**The Problem:**
The authentication system doesn't check if passwords have been exposed in known data breaches.

**Impact:** Users may set passwords that are already compromised, making accounts vulnerable to credential stuffing attacks.

**Fix:** Enable leaked password protection in the backend authentication settings.

---

## Low Severity Issues

### 4. Missing Profile INSERT Policy

**Severity: LOW (functional impact)**

**The Problem:**
The `profiles` table has no INSERT policy, which could prevent new user profiles from being created during signup.

```
Currently, the database trigger `handle_new_user()` creates profiles 
using SECURITY DEFINER, which bypasses RLS. This is working correctly.
```

**Status:** Currently functioning due to the trigger, but adding an explicit policy would be more robust.

---

### 5. Weak Password Requirements

**Severity: LOW**

**The Problem:**
The minimum password length is only 6 characters:
- `AdminLogin.tsx` line 96: `minLength={6}`
- `create-team-user` edge function line 69: `password.length < 6`

**Recommendation:** Increase to 8+ characters with complexity requirements.

---

### 6. Debug Logging in Production

**Severity: LOW**

**The Problem:**
The `NotFound.tsx` component logs attempted routes to the console:

```typescript
console.error("404 Error: User attempted to access non-existent route:", location.pathname);
```

**Impact:** Exposes internal routing structure; not a direct security risk but poor practice for production.

---

### 7. Admins Cannot View Other Users' Roles

**Severity: LOW (functional limitation)**

**The Problem:**
The RLS policy on `user_roles` only allows users to view their own roles:

```sql
USING (auth.uid() = user_id)
```

This means the admin dashboard's team management must use the service role via edge functions (which is currently being done correctly).

**Status:** Mitigated by edge function architecture.

---

## Security Strengths (Good Practices Found)

| Area | Status | Details |
|------|--------|---------|
| RLS Enabled | ✅ | All tables have Row Level Security enabled |
| Lead Access Control | ✅ | Only admins can UPDATE/DELETE leads; users see only assigned leads |
| Profile Isolation | ✅ | Users can only view/update their own profile |
| Role Check Function | ✅ | `has_role()` uses SECURITY DEFINER correctly to avoid recursion |
| Admin Verification | ✅ | Edge functions verify admin role before privileged operations |
| Self-Deletion Prevention | ✅ | Admins cannot delete their own accounts |
| No Client-Side Role Assignment | ✅ | Admin roles are not assigned client-side |
| Form Validation | ✅ | Zod schema validates name, email, phone, message length |
| Phone Validation | ✅ | Regex pattern validates international phone formats |

---

## Remediation Plan

### Phase 1: Fix Critical/Medium Issues

1. **Add CSV Injection Protection**
   - Update the `exportLeadsToCSV` function to sanitize cell values
   - Prefix dangerous characters with a single quote

2. **Enable Leaked Password Protection**
   - Enable in Lovable Cloud authentication settings
   - No code changes required

3. **Consider Rate Limiting for Lead Submissions** (recommended but optional)
   - Create an edge function to handle lead submissions
   - Implement IP-based rate limiting (e.g., 5 submissions per hour)
   - Add honeypot field for bot detection

### Phase 2: Enhance Security

1. **Increase Password Requirements**
   - Change minimum length from 6 to 8 characters
   - Consider adding complexity requirements

2. **Remove Debug Logging**
   - Remove `console.error` from NotFound component

3. **Add Admin Role SELECT Policy** (optional)
   - Add RLS policy: `has_role(auth.uid(), 'admin'::app_role)` for admin visibility
   - Currently mitigated by edge functions

---

## Technical Implementation Details

### Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `src/pages/admin/AdminDashboard.tsx` | Add CSV injection protection | High |
| `src/pages/admin/AdminLogin.tsx` | Increase password minLength to 8 | Low |
| `supabase/functions/create-team-user/index.ts` | Increase password minimum to 8 | Low |
| `src/pages/NotFound.tsx` | Remove console.error logging | Low |

### CSV Injection Fix

```typescript
const sanitizeCSVCell = (value: string): string => {
  // Escape double quotes
  let sanitized = value.replace(/"/g, '""');
  // Prevent formula injection
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = "'" + sanitized;
  }
  return `"${sanitized}"`;
};
```

### Database Changes (Optional)

```sql
-- Add policy for admins to view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR auth.uid() = user_id
);
```

---

## Summary

| Priority | Issue | Risk Level | Effort |
|----------|-------|------------|--------|
| 1 | CSV injection protection | MEDIUM | Low |
| 2 | Enable leaked password protection | MEDIUM | None (settings) |
| 3 | Rate limiting for leads (optional) | MEDIUM | Medium |
| 4 | Increase password requirements | LOW | Low |
| 5 | Remove debug logging | LOW | Low |

Your project has solid security foundations with proper RLS policies for data access control. The main areas for improvement are the CSV export vulnerability and enabling additional authentication protections.

