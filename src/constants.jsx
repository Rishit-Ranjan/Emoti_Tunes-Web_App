import { HappyIcon, SadIcon, AngryIcon, JoyfulIcon, MelancholyIcon, EnergeticIcon } from './components/icons/EmotionIcons';
export const EMOTIONS = [
    {
        name: 'happy',
        description: 'Feeling upbeat and happy.',
        icon: HappyIcon,
        color: 'text-yellow-300',
        gradient: 'from-yellow-500/10 to-[#0a0a12]',
        recommendations: [
            { title: 'Walking on Sunshine', artist: 'Katrina & The Waves' },
            { title: 'Happy', artist: 'Pharrell Williams' },
            { title: 'Good Vibrations', artist: 'The Beach Boys' }
        ]
    },
    {
        name: 'sad',
        description: 'For quiet, reflective moments.',
        icon: SadIcon,
        color: 'text-blue-300',
        gradient: 'from-blue-500/10 to-[#0a0a12]',
        recommendations: [
            { title: 'Someone Like You', artist: 'Adele' },
            { title: 'Fix You', artist: 'Coldplay' },
            { title: 'Yesterday', artist: 'The Beatles' }
        ]
    },
    {
        name: 'angry',
        description: 'To channel your frustration.',
        icon: AngryIcon,
        color: 'text-red-400',
        gradient: 'from-red-500/10 to-[#0a0a12]',
        recommendations: [
            { title: 'Break Stuff', artist: 'Limp Bizkit' },
            { title: 'Killing In The Name', artist: 'Rage Against The Machine' },
            { title: 'Bulls On Parade', artist: 'Rage Against The Machine' }
        ]
    },
    {
        name: 'pleasant', // Mapped from Excitement
        description: 'High-energy and thrilling.',
        icon: JoyfulIcon,
        color: 'text-orange-400',
        gradient: 'from-orange-500/10 to-[#0a0a12]',
        recommendations: [
            { title: "Can't Stop", artist: 'Red Hot Chili Peppers' },
            { title: 'Thunderstruck', artist: 'AC/DC' },
            { title: 'Mr. Brightside', artist: 'The Killers' }
        ]
    },
    {
        name: 'fear', // Mapped from Melancholy
        description: 'Bittersweet and thoughtful.',
        icon: MelancholyIcon,
        color: 'text-indigo-300',
        gradient: 'from-indigo-500/10 to-[#0a0a12]',
        recommendations: [
            { title: 'Creep', artist: 'Radiohead' },
            { title: 'Hurt', artist: 'Johnny Cash' },
            { title: 'The Night We Met', artist: 'Lord Huron' }
        ]
    },
    {
        name: 'neutral', // Mapped from Peaceful
        description: 'Calm, serene, and relaxing.',
        icon: EnergeticIcon,
        color: 'text-green-300',
        gradient: 'from-green-500/10 to-[#0a0a12]',
        recommendations: [
            { title: 'Weightless', artist: 'Marconi Union' },
            { title: 'River Flows In You', artist: 'Yiruma' },
            { title: 'Clair de Lune', artist: 'Claude Debussy' }
        ]
    },
    {
        name: 'disgust', // Mapped from Sad-Anger
        description: 'Feeling aversion or strong disapproval.',
        icon: AngryIcon,
        color: 'text-purple-400',
        gradient: 'from-purple-500/10 to-[#0a0a12]',
        recommendations: [
            { title: 'In the End', artist: 'Linkin Park' },
            { title: 'Numb', artist: 'Linkin Park' },
            { title: 'Liability', artist: 'Lorde' }
        ]
    }
];
