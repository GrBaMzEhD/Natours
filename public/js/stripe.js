/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';
import Stripe from 'stripe';
var stripe = Stripe(
    'pk_test_51NvdY0FLc0fAn1rAMvBdy1i8IjdKOTK3YPsH83syUkjvXToOM3K0n3Ylggo22QpaHnTuFrxOIq6g7qDQDKm2sOD000sbnE4opy',
);

export const bookTour = async (tourId) => {
    try {
        // 1) Get checkout session from api
        const session = await axios(
            `/api/v1/bookings/checkout-session/${tourId}`,
        );
        // 2) Create checout form + charge credit card
        window.location.replace(session.data.session.url);
    } catch (err) {
        console.log(err);
        showAlert('error', err);
    }
};
