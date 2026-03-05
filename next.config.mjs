import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: isDev ? '.next-dev' : '.next',
    async redirects() {
        return [
            {source: '/en', destination: '/', permanent: true},
            {source: '/stickers/1', destination: '/stickers', permanent: true},
            {source: '/stickers/0', destination: '/stickers', permanent: true},
            {source: '/:locale/stickers/1', destination: '/:locale/stickers', permanent: true},
            {source: '/:locale/stickers/0', destination: '/:locale/stickers', permanent: true},
        ];
    }
};

export default withNextIntl(nextConfig);
