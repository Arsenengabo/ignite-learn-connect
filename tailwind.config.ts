import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: {
    			DEFAULT: '1rem',
    			sm: '1.5rem',
    			lg: '2rem'
    		},
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	screens: {
    		'xs': '375px',
    		'sm': '640px',
    		'md': '768px',
    		'lg': '1024px',
    		'xl': '1280px',
    		'2xl': '1536px',
    		'fold': { 'raw': '(min-width: 280px) and (max-width: 320px)' },
    		'landscape': { 'raw': '(max-height: 500px) and (orientation: landscape)' },
    	},
    	extend: {
    		colors: {
    			ilc: {
    				navy: 'hsl(var(--ilc-navy-hsl))',
    				'navy-mid': 'hsl(var(--ilc-navy-mid-hsl))',
    				'navy-light': 'hsl(var(--ilc-navy-light-hsl))',
    				amber: 'hsl(var(--ilc-amber-hsl))',
    				teal: 'hsl(var(--ilc-teal-hsl))',
    				coral: 'hsl(var(--ilc-coral-hsl))',
    				success: 'hsl(var(--ilc-success-hsl))',
    				text: 'hsl(var(--ilc-text-hsl))',
    				'text-muted': 'hsl(var(--ilc-text-muted-hsl))'
    			},
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))',
    				light: 'hsl(var(--primary-light))',
    				dark: 'hsl(var(--primary-dark))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))',
    				light: 'hsl(var(--secondary-light))'
    			},
    			learning: {
    				DEFAULT: 'hsl(var(--learning))',
    				foreground: 'hsl(var(--learning-foreground))',
    				light: 'hsl(var(--learning-light))'
    			},
    			achievement: {
    				DEFAULT: 'hsl(var(--achievement))',
    				foreground: 'hsl(var(--achievement-foreground))',
    				light: 'hsl(var(--achievement-light))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))',
    				hover: 'hsl(var(--card-hover))'
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out'
    		},
    		fontFamily: {
    			display: [
    				'DM Sans',
    				'Inter',
    				'ui-sans-serif',
    				'system-ui',
    				'sans-serif'
    			],
    			num: [
    				'JetBrains Mono',
    				'Space Mono',
    				'ui-monospace',
    				'monospace'
    			],
    			sans: [
    				'Inter',
    				'ui-sans-serif',
    				'system-ui',
    				'-apple-system',
    				'BlinkMacSystemFont',
    				'Segoe UI',
    				'Roboto',
    				'Helvetica Neue',
    				'Arial',
    				'Noto Sans',
    				'sans-serif'
    			],
    			serif: [
    				'Lora',
    				'ui-serif',
    				'Georgia',
    				'Cambria',
    				'Times New Roman',
    				'Times',
    				'serif'
    			],
    			mono: [
    				'Space Mono',
    				'ui-monospace',
    				'SFMono-Regular',
    				'Menlo',
    				'Monaco',
    				'Consolas',
    				'Liberation Mono',
    				'Courier New',
    				'monospace'
    			]
    		},
    		boxShadow: {
    			'2xs': 'var(--shadow-2xs)',
    			xs: 'var(--shadow-xs)',
    			sm: 'var(--shadow-sm)',
    			md: 'var(--shadow-md)',
    			lg: 'var(--shadow-lg)',
    			xl: 'var(--shadow-xl)',
    			'2xl': 'var(--shadow-2xl)'
    		}
    	}
    },
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
