import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DebugPage } from './DebugPage';

describe('DebugPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders workflow controls and empty debug sections', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          orders: [],
          timeline: [],
          outbox: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<DebugPage />);

    expect(
      screen.getByRole('heading', { name: /orderflow debug/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create success/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument();
  });
});
