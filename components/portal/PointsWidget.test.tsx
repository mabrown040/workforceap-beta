import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PointsWidget from './PointsWidget';
import type { LevelName } from '@/lib/member/pointsConfig';

describe('PointsWidget', () => {
  it('renders points and level badge in full mode', () => {
    render(<PointsWidget total={350} level="builder" />);
    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('My Points')).toBeInTheDocument();
    // Badge + level pill both say Builder — assert count instead
    expect(screen.getAllByText('Builder')).toHaveLength(2);
  });

  it('renders compact mode', () => {
    render(<PointsWidget total={150} level="starter" compact />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText(/points/i)).toBeInTheDocument();
    expect(screen.queryByText(/my points/i)).not.toBeInTheDocument();
  });

  it('shows progress to next level', () => {
    render(<PointsWidget total={350} level="builder" />);
    expect(screen.getByText(/% to achiever/i)).toBeInTheDocument();
    expect(screen.getByText(/pts needed/i)).toBeInTheDocument();
  });

  it('shows 100% when at max level (champion)', () => {
    render(<PointsWidget total={1200} level="champion" />);
    expect(screen.queryByText(/% to/i)).not.toBeInTheDocument();
  });

  it('renders level pills for all levels', () => {
    render(<PointsWidget total={350} level="builder" />);
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getAllByText('Builder')).toHaveLength(2);
    expect(screen.getByText('Achiever')).toBeInTheDocument();
    expect(screen.getByText('Champion')).toBeInTheDocument();
  });

  it('renders recent transactions', () => {
    const recent = [
      { id: '1', event: 'resume_uploaded', points: 50, note: null, createdAt: new Date() },
      { id: '2', event: 'custom', points: 10, note: 'Bonus', createdAt: new Date() },
    ];
    render(<PointsWidget total={350} level="builder" recent={recent} />);
    expect(screen.getByText('Uploaded resume')).toBeInTheDocument();
    expect(screen.getByText('Bonus')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('renders link to points page', () => {
    render(<PointsWidget total={100} level="starter" />);
    expect(screen.getByText(/how to earn points/i)).toBeInTheDocument();
  });

  it('formats large numbers with locale string', () => {
    render(<PointsWidget total={12345} level="champion" />);
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('renders a streak banner when an explicit current streak is passed', () => {
    render(<PointsWidget total={350} level="builder" currentStreak={5} longestStreak={5} />);
    // Streak renders in both the banner and the (intentional) StreakMiniCard
    expect(screen.getAllByText('5-day streak')[0]).toBeInTheDocument();
    expect(screen.getByText(/best streak yet/i)).toBeInTheDocument();
  });

  it('hides the streak banner when explicit streak is zero', () => {
    render(<PointsWidget total={350} level="builder" currentStreak={0} longestStreak={0} />);
    expect(screen.queryByText(/day streak/i)).not.toBeInTheDocument();
  });

  it('shows best-streak hint when current is below the record', () => {
    render(<PointsWidget total={350} level="builder" currentStreak={3} longestStreak={9} />);
    // Streak + best-streak hint render in both the banner and the (intentional) StreakMiniCard
    expect(screen.getAllByText('3-day streak')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Best: 9 days/)[0]).toBeInTheDocument();
  });

  it('renders StreakMiniCard when explicit streak is passed', () => {
    render(<PointsWidget total={350} level="builder" currentStreak={3} longestStreak={9} />);
    // StreakMiniCard always renders alongside the banner when any streak data exists
    expect(screen.getAllByText(/3-day streak/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Best: 9 days/)[0]).toBeInTheDocument();
  });

  it('renders StreakMiniCard encouraging state when streak is zero', () => {
    render(<PointsWidget total={350} level="builder" currentStreak={0} longestStreak={0} />);
    expect(screen.getByText('No active streak')).toBeInTheDocument();
    expect(screen.getByText('Start today!')).toBeInTheDocument();
  });
});
