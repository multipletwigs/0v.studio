import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
          }}
        >
          {/* 0v Logo */}
          <svg
            width="120"
            height="120"
            viewBox="0 0 16 16"
            fill="white"
          >
            <path d="M0 10.0952H1.5238V6.6071L5.0119 10.0952H1.5238V11.6190H5.4762C6.6597 11.6190 7.6190 10.6597 7.6190 9.4762V5.5238H6.0952V9.0238L2.5953 5.5238H6.0952V4H2.1429C0.9593 4 0 4.9594 0 6.1429V10.0952Z" />
            <path d="M9.9048 9.4643V5.5238H8.3810V10.5476C8.3810 11.1394 8.8606 11.6190 9.4524 11.6190C9.7349 11.6190 10.0138 11.5101 10.2143 11.3096L16 5.5238H13.8452L9.9048 9.4643Z" />
          </svg>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
            }}
          >
            Team 0v
          </span>
        </div>
        <span
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 24,
          }}
        >
          Sketch to UI in seconds
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
