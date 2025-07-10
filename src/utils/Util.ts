import axios from "axios";
import {PaginateDataResponseType} from "../constants/Types";


export const getDataFromFIYGE = async (accessToken: string, endpoint: string) => {
    const response = await axios.get<PaginateDataResponseType>(process.env.FIYGE_SERVER_URL + endpoint, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    })

    return response.data;
}

export const getFIYGECountryList = async (accessToken: string) => {
    return await getDataFromFIYGE(accessToken, "/masters/countries/index.json?track_open=0&q=%7B%20%22fields%22%3A%20%5B%22countries.country_name%22%2C%20%22countries.iso3%22%2C%20%22countries.iso2%22%2C%20%22%7B%7BMODEL%7D%7D.%7B%7BPRIMARY_KEY%7D%7D%22%5D%2C%20%22limit%22%3A%20-1%20%7D")
}

export const bulkInsertIntoFiyge = async (accessToken: string, endpoint: string, data: Record<string, any>) => {
    const fiygeUrl = process.env.FIYGE_SERVER_URL + endpoint;
    const formData = new URLSearchParams(data);

    return await axios.post(fiygeUrl, formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${accessToken}`,
        },
    });
}