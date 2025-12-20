import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				'50': '#EDEEFF',
  				'100': '#DBD9FF',
  				'200': '#BEB9FF',
  				'300': '#A099FF',
  				'400': '#8179FF',
  				'500': '#6366F1',
  				'600': '#4345D9',
  				'700': '#3334B0',
  				'800': '#252688',
  				'900': '#181960',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				'50': '#FDF2F8',
  				'100': '#FCE7F3',
  				'200': '#FBCFE8',
  				'300': '#F9A8D4',
  				'400': '#F472B6',
  				'500': '#EC4899',
  				'600': '#DB2777',
  				'700': '#BE185D',
  				'800': '#9D174D',
  				'900': '#831843',
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			success: {
  				'50': '#ECFDF5',
  				'100': '#D1FAE5',
  				'200': '#A7F3D0',
  				'300': '#6EE7B7',
  				'400': '#34D399',
  				'500': '#10B981',
  				'600': '#059669',
  				'700': '#047857',
  				'800': '#065F46',
  				'900': '#064E3B',
  				DEFAULT: '#10B981'
  			},
  			warning: {
  				'50': '#FFFBEB',
  				'100': '#FEF3C7',
  				'200': '#FDE68A',
  				'300': '#FCD34D',
  				'400': '#FBBF24',
  				'500': '#F59E0B',
  				'600': '#D97706',
  				'700': '#B45309',
  				'800': '#92400E',
  				'900': '#78350F',
  				DEFAULT: '#F59E0B'
  			},
  			error: {
  				'50': '#FEF2F2',
  				'100': '#FEE2E2',
  				'200': '#FECACA',
  				'300': '#FCA5A5',
  				'400': '#F87171',
  				'500': '#EF4444',
  				'600': '#DC2626',
  				'700': '#B91C1C',
  				'800': '#991B1B',
  				'900': '#7F1D1D',
  				DEFAULT: '#EF4444'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			heading: [
  				'var(--font-poppins)',
  				'sans-serif'
  			],
  			body: [
  				'var(--font-inter)',
  				'sans-serif'
  			],
  			sans: [
  				'var(--font-inter)',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			'display-1': [
  				'4rem',
  				{
  					lineHeight: '1.2',
  					fontWeight: '700'
  				}
  			],
  			'display-2': [
  				'3rem',
  				{
  					lineHeight: '1.2',
  					fontWeight: '700'
  				}
  			],
  			h1: [
  				'2.5rem',
  				{
  					lineHeight: '1.2',
  					fontWeight: '700'
  				}
  			],
  			h2: [
  				'2rem',
  				{
  					lineHeight: '1.3',
  					fontWeight: '600'
  				}
  			],
  			h3: [
  				'1.5rem',
  				{
  					lineHeight: '1.4',
  					fontWeight: '600'
  				}
  			],
  			h4: [
  				'1.25rem',
  				{
  					lineHeight: '1.4',
  					fontWeight: '600'
  				}
  			],
  			h5: [
  				'1.125rem',
  				{
  					lineHeight: '1.5',
  					fontWeight: '600'
  				}
  			],
  			h6: [
  				'1rem',
  				{
  					lineHeight: '1.5',
  					fontWeight: '600'
  				}
  			]
  		},
  		spacing: {
  			'18': '4.5rem',
  			'128': '32rem',
  			'144': '36rem'
  		},
  		borderRadius: {
  			'4xl': '2rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			'glow-primary': '0 0 20px rgba(99, 102, 241, 0.3)',
  			'glow-secondary': '0 0 20px rgba(236, 72, 153, 0.3)',
  			soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)'
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.3s ease-in-out',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'slide-down': 'slideDown 0.3s ease-out',
  			gradient: 'gradient 3s ease infinite'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			slideUp: {
  				'0%': {
  					transform: 'translateY(10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			slideDown: {
  				'0%': {
  					transform: 'translateY(-10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			gradient: {
  				'0%, 100%': {
  					backgroundPosition: '0% 50%'
  				},
  				'50%': {
  					backgroundPosition: '100% 50%'
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
