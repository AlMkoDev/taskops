# AgriReports Testing Suite

## Overview

Comprehensive automated testing framework using **Jest** and **React Testing Library** for the AgriReports platform, with CI/CD integration via GitHub Actions.

---

## Testing Stack

| Tool | Purpose |
|------|---------|
| **Jest** | Test runner and assertion library |
| **React Testing Library** | Component testing utilities |
| **ts-jest** | TypeScript support for Jest |
| **supertest** | API integration testing |
| **GitHub Actions** | CI/CD pipeline |

---

## Quick Start

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests for CI

```bash
npm run test:ci
```

---

## Test Structure

```
src/
├── lib/
│   ├── notifications/
│   │   ├── __tests__/
│   │   │   ├── email-service.test.ts
│   │   │   └── whatsapp-service.test.ts
│   │   ├── email-service.ts
│   │   └── whatsapp-service.ts
│   ├── queue/
│   │   └── __tests__/
│   │       └── queue-config.test.ts
│   └── monitoring/
│       └── __tests__/
│           └── metrics.test.ts
├── app/
│   └── api/
│       └── __tests__/
│           └── reports.test.ts
```

---

## Writing Tests

### Unit Tests

**Example: Service Testing**

```typescript
import { sendEmail } from '../email-service';

// Mock external dependencies
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send email successfully', async () => {
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    // Assertions
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP error'));

    await expect(
      sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      })
    ).rejects.toThrow('SMTP error');
  });
});
```

### Integration Tests

**Example: API Route Testing**

```typescript
import request from 'supertest';
import { createApp } from '@/test/utils';

describe('Reports API', () => {
  const app = createApp();

  it('should create a report', async () => {
    const response = await request(app)
      .post('/api/v1/reports')
      .send({
        title: 'Test Report',
        period: 'daily',
        role: 'field_ops_manager',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/v1/reports')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('title');
  });
});
```

### Component Tests

**Example: React Component Testing**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsModule } from '../reports-module';

describe('ReportsModule', () => {
  it('should render login form', () => {
    render(<ReportsModule />);
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should handle login submission', async () => {
    render(<ReportsModule />);
    
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Wait for async operation
    await screen.findByText(/loading/i);
  });
});
```

---

## Test Configuration

### Jest Config (jest.config.ts)

```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default createJestConfig(config);
```

### Jest Setup (jest.setup.ts)

```typescript
import '@testing-library/jest-dom';

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
});

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
  }),
}));

// Global fetch mock
globalThis.fetch = jest.fn();
```

---

## Coverage Requirements

| Metric | Threshold |
|--------|-----------|
| **Branches** | 60% |
| **Functions** | 70% |
| **Lines** | 70% |
| **Statements** | 70% |

**View Coverage Report:**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Located at: `.github/workflows/ci.yml`

**Pipeline Stages:**

1. **Test** - Run all tests with coverage
   - Spin up PostgreSQL and Redis
   - Run migrations
   - Execute test suite
   - Upload coverage to Codecov

2. **Build** - Build Next.js application
   - Install dependencies
   - Run `npm run build`
   - Upload build artifacts

3. **Deploy** (Production only)
   - Triggered on `main` branch
   - Deploy to production server

### Pipeline Triggers

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

### Required Checks

Before merging PRs:
- ✅ All tests pass
- ✅ Coverage thresholds met
- ✅ Build succeeds
- ✅ Linting passes

---

## Testing Best Practices

### ✅ Do

1. **Test behavior, not implementation**
   ```typescript
   // ✅ Good: Tests user-visible behavior
   it('should display error message', () => {
     render(<LoginForm />);
     fireEvent.click(screen.getByText('Login'));
     expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
   });

   // ❌ Bad: Tests internal state
   it('should set error state', () => {
     const component = render(<LoginForm />);
     expect(component.state.error).toBe('Invalid credentials');
   });
   ```

2. **Use descriptive test names**
   ```typescript
   // ✅ Good
   it('should send welcome email when user registers', () => {});

   // ❌ Bad
   it('test1', () => {});
   ```

3. **Mock external dependencies**
   ```typescript
   // ✅ Good: Mock API calls
   jest.mock('axios', () => ({
     post: jest.fn().mockResolvedValue({ data: { id: 1 } }),
   }));

   // ❌ Bad: Real API calls in tests
   it('should create user', async () => {
     await axios.post('/api/users', userData); // Slow, unreliable
   });
   ```

4. **Test edge cases**
   ```typescript
   it('should handle empty input', () => {});
   it('should handle network errors', () => {});
   it('should handle invalid data', () => {});
   it('should handle timeout', () => {});
   ```

5. **Use beforeEach/afterEach for cleanup**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });

   afterEach(() => {
     cleanup();
   });
   ```

### ❌ Don't

1. **Don't test third-party libraries**
   ```typescript
   // ❌ Don't test React itself
   it('should render div', () => {
     const { container } = render(<div />);
     expect(container.querySelector('div')).toBeInTheDocument();
   });
   ```

2. **Don't use snapshots for everything**
   ```typescript
   // ❌ Overuse of snapshots
   it('should match snapshot', () => {
     const { container } = render(<Component />);
     expect(container).toMatchSnapshot();
   });

   // ✅ Use for stable UI components
   it('should render icon correctly', () => {
     const { container } = render(<Icon name="home" />);
     expect(container).toMatchSnapshot();
   });
   ```

3. **Don't ignore test failures**
   - Fix failing tests immediately
   - Don't skip tests without justification
   - Update tests when requirements change

---

## Test Categories

### 1. Unit Tests

**What to test:**
- Utility functions
- Service methods
- Validation logic
- Data transformations

**Example files:**
- `src/lib/notifications/__tests__/email-service.test.ts`
- `src/lib/notifications/__tests__/whatsapp-service.test.ts`

### 2. Integration Tests

**What to test:**
- API routes
- Database operations
- External service calls
- End-to-end workflows

**Example files:**
- `src/app/api/__tests__/reports.test.ts`
- `src/app/api/__tests__/auth.test.ts`

### 3. Component Tests

**What to test:**
- UI rendering
- User interactions
- State changes
- Props validation

**Example files:**
- `src/components/__tests__/reports-module.test.tsx`
- `src/components/__tests__/task-detail-panel.test.tsx`

---

## Debugging Tests

### Run Single Test File

```bash
npm test -- src/lib/notifications/__tests__/email-service.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should send email"
```

### Debug with Node Inspector

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome.

### Verbose Output

```bash
npm test -- --verbose
```

### Show Console Logs

```bash
npm test -- --verbose --no-silent
```

---

## Common Patterns

### Testing Async Operations

```typescript
it('should fetch data', async () => {
  mockFetch.mockResolvedValue({ json: () => Promise.resolve({ data: [] }) });

  render(<DataComponent />);

  // Wait for async operation
  const items = await screen.findAllByRole('listitem');
  expect(items).toHaveLength(3);
});
```

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useReportsList } from '../use-agrireports';

it('should fetch reports', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useReportsList());

  await waitForNextUpdate();

  expect(result.current.reports).toHaveLength(5);
  expect(result.current.loading).toBe(false);
});
```

### Testing Error Boundaries

```typescript
it('should catch and display errors', () => {
  // Mock component that throws
  const BrokenComponent = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <BrokenComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

---

## Performance Tips

### 1. Use --watch for Development

```bash
npm run test:watch
```

Only runs tests related to changed files.

### 2. Run Tests in Parallel

```bash
npm test -- --maxWorkers=4
```

### 3. Skip Coverage for Fast Feedback

```bash
npm test -- --coverage=false
```

### 4. Use Test Sharding for CI

```yaml
- name: Run tests (shard 1)
  run: npm test -- --shard=1/3

- name: Run tests (shard 2)
  run: npm test -- --shard=2/3

- name: Run tests (shard 3)
  run: npm test -- --shard=3/3
```

---

## Troubleshooting

### Tests Fail Locally but Pass in CI

**Check:**
- Environment variables match
- Database state is clean
- Node.js version matches
- Dependencies are up to date

**Fix:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Jest cache
npm test -- --clearCache
```

### Tests Are Slow

**Optimize:**
- Mock expensive operations
- Use `--watch` for development
- Reduce test data size
- Parallelize independent tests

### Coverage Drops Unexpectedly

**Check:**
- New code without tests
- Changed logic breaking tests
- Deleted tests for existing code

**Fix:**
```bash
# Find untested files
npm run test:coverage

# Review coverage report
open coverage/lcov-report/index.html
```

---

## Next Steps

### Immediate

1. **Run tests:** `npm test`
2. **Check coverage:** `npm run test:coverage`
3. **Fix any failures**
4. **Add tests for uncovered code**

### Short-Term

1. **Increase coverage to 80%**
2. **Add E2E tests** (Playwright/Cypress)
3. **Add performance tests**
4. **Set up Codecov dashboard**

### Long-Term

1. **Add mutation testing** (Stryker)
2. **Implement contract testing** (Pact)
3. **Add load testing** (k6)
4. **Set up test analytics**

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-testing-mistakes)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)

---

**Implementation Date:** April 21, 2026  
**Testing Framework:** Jest + React Testing Library  
**CI/CD:** GitHub Actions  
**Coverage Target:** 70%+
