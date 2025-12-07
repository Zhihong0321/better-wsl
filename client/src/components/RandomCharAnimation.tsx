import { createSignal, onMount, onCleanup, mergeProps } from 'solid-js';

interface RandomCharAnimationProps {
    length?: number;
    chars?: string;
    class?: string;
    style?: any;
    gradient?: boolean;
}

export default function RandomCharAnimation(props: RandomCharAnimationProps) {
    const merged = mergeProps({
        length: 10,
        chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
        gradient: true
    }, props);

    const [text, setText] = createSignal('');
    let frameId: number;
    let lastTime = 0;
    const interval = 1000 / 60; // 60fps

    const generateRandomString = () => {
        let result = '';
        for (let i = 0; i < merged.length; i++) {
            result += merged.chars.charAt(Math.floor(Math.random() * merged.chars.length));
        }
        return result;
    };

    const animate = (time: number) => {
        if (time - lastTime > interval) {
            setText(generateRandomString());
            lastTime = time;
        }
        frameId = requestAnimationFrame(animate);
    };

    onMount(() => {
        frameId = requestAnimationFrame(animate);
    });

    onCleanup(() => {
        cancelAnimationFrame(frameId);
    });

    return (
        <span
            class={merged.class}
            style={{
                "font-family": 'monospace',
                "font-weight": 'bold',
                "display": "inline-block",
                "white-space": "pre",
                ...(merged.gradient ? {
                    "background": 'linear-gradient(90deg, #ff00cc, #3333ff, #ff00cc)',
                    "background-size": '200% auto',
                    "-webkit-background-clip": 'text',
                    "-webkit-text-fill-color": 'transparent',
                    "background-clip": 'text',
                    "color": 'transparent',
                    "animation": 'gradient-text-flow 2s linear infinite'
                } : {}),
                ...merged.style
            }}
        >
            {text()}
        </span>
    );
}
