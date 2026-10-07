const API_BASE_URL = 'http://localhost:8000/api/v1'

/**
 * Fetch active triage queue cases from Django API
 */
export async function getTriageCases() {
    try {
        const response = await fetch(`${API_BASE_URL}/cases/triage/`)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.warn('Backend connection pending. Returning initial state.', error)
        return [
            {
                id: 'ETH-2026-9041',
                sourceBank: 'CBE',
                targetBank: 'Telebirr',
                targetAccount: '0922****19',
                amount: 'ETB 145,000',
                riskScore: 94,
                velocity: '3 hops / 45s',
                status: 'UNASSIGNED',
                timestamp: '00:41:10 UTC',
            },
            {
                id: 'ETH-2026-9038',
                sourceBank: 'Dashen Bank',
                targetBank: 'BOA',
                targetAccount: '1000****42',
                amount: 'ETB 320,000',
                riskScore: 88,
                velocity: '2 hops / 2m',
                status: 'IN_REVIEW',
                timestamp: '00:38:02 UTC',
            },
        ]
    }
}

/**
 * Dispatch an emergency freeze order to EthSwitch gateway
 */
export async function dispatchFreezeOrder(payload) {
    const response = await fetch(`${API_BASE_URL}/interventions/freeze/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        throw new Error('Freeze directive transmission failed.')
    }

    return await response.json()
}