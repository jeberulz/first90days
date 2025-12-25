import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { email, firstName, utmSource, utmMedium, utmCampaign } = await request.json();

        if (!email || !firstName) {
            return NextResponse.json(
                { error: 'Email and First Name are required' },
                { status: 400 }
            );
        }

        const API_KEY = process.env.BEEHIIV_API_KEY;
        const PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

        if (!API_KEY || !PUBLICATION_ID) {
            console.error('Missing Beehiiv configuration');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const response = await fetch(
            `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                    email,
                    reactivate_existing: false,
                    send_welcome_email: true,
                    utm_source: utmSource || 'first90',
                    utm_medium: utmMedium || 'website',
                    utm_campaign: utmCampaign || 'waitlist',
                    custom_fields: [
                        {
                            name: 'First Name',
                            value: firstName,
                        },
                    ],
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Beehiiv API Error:', data);
            return NextResponse.json(
                { error: data.errors?.[0]?.message || 'Failed to subscribe' },
                { status: response.status }
            );
        }

        return NextResponse.json(
            { message: 'Successfully subscribed' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
