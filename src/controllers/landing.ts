import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../utils/http';
import { logger } from '../utils/logger';

const landingData = {
  nav: ['Solutions', 'Pricing', 'Dashboard', 'FAQs'],
  hero: {
    eyebrow: "World's First AI Powered Influencer Search Engine",
    heading: ['Find verified creators', 'launch faster campaigns', 'and scale with clarity.'],
    description:
      'Search by niche, region, audience fit, and live performance signals in one smooth workflow built for modern growth teams.',
    placeholder: 'Search creators, categories, or campaign goals...',
    primaryCta: 'Search Creators',
    secondaryCta: 'Enter Dashboard',
  },
  stats: [
    { label: 'Active micro creators', value: '50K' },
    { label: 'Countries covered', value: '15+' },
    { label: 'Brands matched', value: '300+' },
    { label: 'Average match score', value: '97.8%' },
  ],
  story: {
    title: 'Phyo simplifies influencer discovery, analysis, and campaign launches.',
    subtitle: 'Spend less time planning and more time scaling with a component-first growth workflow.',
  },
  features: [
    {
      tag: 'Discover',
      title: 'Find creators in seconds',
      description:
        'Use live filters for niche, audience quality, category, performance, and language with quick response cards.',
      metric: 'Instant filtering',
      visual: 'phone',
    },
    {
      tag: 'Track',
      title: 'Track your campaigns live',
      description:
        'Monitor approvals, active creators, performance snapshots, and spend movement from one shared view.',
      metric: 'Live campaign pulse',
      visual: 'laptop',
    },
    {
      tag: 'Scale',
      title: 'Fully managed campaigns',
      description:
        'Move from sourcing to launch with reusable checklists, team roles, and guided execution panels.',
      metric: 'Role-ready workflow',
      visual: 'cards',
    },
  ],
  pricingTabs: ['Monthly', 'Yearly', 'Custom'],
  plans: [
    {
      name: 'Bronze',
      price: '$0',
      note: 'Free forever',
      description: 'Perfect for testing creator discovery before scaling paid campaigns.',
      features: ['Up to 25 results', 'Basic filters', 'Role preview', 'Saved searches'],
      featured: false,
    },
    {
      name: 'Growth',
      price: '$29',
      note: 'per month',
      description: 'Best for lean teams that need reusable campaign workflows and tracking.',
      features: ['Unlimited searches', 'Advanced filters', 'Campaign monitoring', 'Role dashboard access'],
      featured: true,
    },
    {
      name: 'Scale',
      price: '$79',
      note: 'per month',
      description: 'For serious brands and agencies that need team coordination and reporting.',
      features: ['Priority data refresh', 'Team seats', 'Performance exports', 'Live creator lists'],
      featured: false,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      note: 'contact sales',
      description: 'Tailored onboarding, managed execution, and integrations for larger programs.',
      features: ['Custom roles', 'Dedicated support', 'SLA reporting', 'Managed campaigns'],
      featured: false,
    },
  ],
  faq: [
    {
      question: 'How do I get started with your services?',
      answer:
        'Pick a role, open the dashboard, and start with the built-in search workflow. The system adapts the overview and actions for your selected role.',
    },
    {
      question: 'Can I manage campaigns and creators from one place?',
      answer:
        'Yes. The dashboard combines creator discovery, campaign monitoring, approvals, and summary cards in a single reusable interface.',
    },
    {
      question: 'Is the landing page built from reusable components?',
      answer:
        'Yes. Every homepage block is split into reusable section components, and the shared UI primitives are designed to be reused across product pages and dashboards.',
    },
    {
      question: 'How is API data handled?',
      answer:
        'The app uses Redux Toolkit with RTK Query for loading landing content, role login, and dashboard data through a single API layer.',
    },
  ],
  comparison: [
    {
      feature: 'Search by audience quality and niche',
      other: 'Basic filters only',
      phyo: 'Advanced live filters with role-aware workflow',
    },
    {
      feature: 'Track campaign progress',
      other: 'Manual spreadsheets',
      phyo: 'Centralized live monitoring cards',
    },
    {
      feature: 'Team role handoff',
      other: 'Custom setup needed',
      phyo: 'Built-in role entry for 3 dashboards',
    },
    {
      feature: 'Reusable UI system',
      other: 'Inconsistent screens',
      phyo: 'Shared tokens and component library',
    },
  ],
  cta: {
    title: 'AI search, verified influencers, live tracking.',
    description:
      'Move from discovery to campaign execution with a reusable platform structure ready for teams.',
  },
};

export const getLandingData = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, 'Landing data retrieved successfully', landingData);
  } catch (error) {
    logger.error('Get landing data error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    sendError(res, 500, 'Failed to fetch landing data', error instanceof Error ? error.message : 'Unknown error');
  }
};
