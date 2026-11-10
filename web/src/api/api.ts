import axios from "axios"

const BASE_URL: string = import.meta.env.VITE_BASE_URL

async function fetch_users(track?: string) {
    const url = track ? `${BASE_URL}?track=${encodeURIComponent(track)}` : BASE_URL
    const response = await axios.get(url)
    return response
}

export { fetch_users }
