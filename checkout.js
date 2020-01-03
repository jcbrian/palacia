const got = require('got')
const config = require('./config.json')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const os = require('os')
const dayjs = require('dayjs')
const prep = require('./prep4checkout')
const scrape = require('./scrape')
const j = require('request').jar();
const request = require('request').defaults({
    timeout: 5000,
    jar: j,
    gzip: true
})
let websiteBaseURL = 'https://shop-usa.palaceskateboards.com';
const connectFileLocation = path.resolve(os.tmpdir(), 'connector');
process.env.UV_THREADPOOL_SIZE = 128;
let tokenBag = []


async function fileManipulation() {
    let doesFileExist
    const checkFile = await fs.access(connectFileLocation, fs.constants.F_OK, (err) => {
        if (err) {
            console.log('file does not exist')
            doesFileExist = false

        } else {
            console.log('file exists')
            doesFileExist = true
            deleteLock(doesFileExist)
        }
    });

    function deleteLock(fileCheck) {
        if (fileCheck == true) {
            console.log('deleting file')
            fs.unlink(connectFileLocation, (err) => {
                if (err) throw err

            });
        } else {
            console.log('no file to delete since file Check is false')
        }

    }



}

function collectCaptcha() {



    function requestForLocalServer() {
        let opts = {
            url: 'http://127.0.0.1:3001/fetch',
            method: 'get',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp, image / apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'accept-encoding': 'gzip, deflate, br',
            'accept-Language': 'en-US,en;q=0.9',
            'cache-control': 'max-age=0',
            connection: 'keep-alive',
            host: '127.0.0.1:3001',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
            timeout: 20000,
            json: true

        }

        request(opts, (e, r, b) => {
            for (let token in b) {
                tokenBag.push(b[token])
            }
            setTimeout(function () {
                console.log('requesting local server')
                requestForLocalServer()
            }, 2000)
        })
    }

    requestForLocalServer()

}

let checkCaptchas = function () {
    return tokenBag.filter((captcha) => {
        const currentTime = dayjs()
        const timeStampedTime = captcha.timestamp
        return currentTime.diff(timeStampedTime, 'seconds') < 105
    })


}

collectCaptcha()
formatPhoneNumber(config.phone);









scrape.firstBody().then(resolve => {
    let href = resolve[0].href;
    let title = resolve[0].alpha;

    prep.getDesiredItem(href, title).then(ObejctsOfSizesAndIds => {
        prep.almost2Checkout(ObejctsOfSizesAndIds).then(desiredItem => {
            let desiredItem1 = desiredItem
            checkout(desiredItem).then(next => {
                getNote().then(note => {
                    fileManipulation()
                    createCheckout(note, desiredItem1).then((resolve) => {
                        let firstOne
                        checkingForCaptcha = function () {
                              return setTimeout(function () {
                                let valide = checkCaptchas()
                                firstOne = valide.shift()
                                        if (firstOne) {
                                            clearTimeout(checkingForCaptcha)
                                            console.log('captcha grabbed')
                                            contactInfo(resolve, firstOne).then((optsForShipping) => {

                                                secondStepOfShipping(optsForShipping)
                                            })
                                        } else {
                                            console.log('waiting for captcha')
                                            checkingForCaptcha()

                                        }
                                
                            }, 2000)
                        }
                        checkingForCaptcha()
                      

                    })


                })

            })
        })
    });
})

function checkout(styleid) {
    return new Promise((resolve, reject) => {
        options = {
            url: 'https://shop-usa.palaceskateboards.com/cart/add.js',
            authority: 'shop-usa.palaceskateboards.com',
            headers: {
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
                'content-length': '28',
                'content-type': 'application/x-www-form-urlencoded',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
            },
            method: 'POST',
            path: '/cart/add.js',
            scheme: 'https',
            accept: '*/*',

            origin: websiteBaseURL,
            referer: 'https://shop-usa.palaceskateboards.com/products/olbg381qo6rs',
            form: {
                id: styleid,
                quantity: '1'
            },
            json: true,



        }
        request(options, (e, r, b) => {
            if (e) {
                console.log(e)
            }
            if (r.statusCode === 200) {
                console.log('product added to bag')
                resolve()
            }

        })

    })

}

function getNote() {
    return new Promise((resolve, reject) => {
        let note;
        let options = {
            url: 'https://shop-usa.palaceskateboards.com/cart',
            authority: 'shop-usa.palaceskateboards.com',
            headers: {
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
                'cache-control': 'max-age-0',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
            },
            method: 'GET',
            path: '/cart',
            scheme: 'https',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',


        }
        request(options, (e, r, b) => {
            if (e) {
                return reject(e)
            }
            if (r.statusCode == 200) {
                let $ = cheerio.load(b)
                note = $('#note').attr('value')
                console.log('request has been made for note')
                resolve(note)

            }
        })
    })


}

function createCheckout(note, desiredItem) {
    let usefulQueryStringInfo = {}
    return new Promise((resolve, reject) => {
        let formString = `updates[${desiredItem}] : 1`
        let opts = {
            timeout: 1500,
            url: 'https://shop-usa.palaceskateboards.com/cart',

            authority: 'shop-usa.palaceskateboards.com',
            method: 'POST',
            path: '/cart',
            scheme: 'https',
            headers: {
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en - US, en; q = 0.9',
                'cache-control': 'max - age=0',
                'content-length': '68',
                'content-type': 'application/x-www-form-urlencoded',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
            },
            origin: websiteBaseURL,
            referer: 'https://shop-usa.palaceskateboards.com/cart',
            followAllRedirects: true,
            form: {
                formString,
                checkout: 'checkout',
                note: note
            }
        }
        request(opts, (e, r, b) => {
            if (e) {
                console.log('error creating checkout')
                return reject(e)
            }

            if (r.statusCode === 200) {
                console.log('checkout created')


                let $ = cheerio.load(b)
                //return object with checkout URL and authenticaty token
                usefulQueryStringInfo.method = $('#content > div > div.palace-checkout-body.clearfix > div.step > form > input[type=hidden]').val()
                usefulQueryStringInfo.token = $('#content > div > div.palace-checkout-body.clearfix > div.step > form > input[type=hidden]:nth-child(2)').val()
                console.log(usefulQueryStringInfo.token)
                usefulQueryStringInfo.shopID = $('#in-context-paypal-metadata ').attr('data-shop-id')
                usefulQueryStringInfo.checkoutURL = $('#content > div > div.palace-checkout-body.clearfix > div.step > form').attr('action')
                let authToken = $('head > meta:nth-child(9)').attr('content')
                console.log(authToken,'this is auth token')
                resolve(usefulQueryStringInfo)
            }
        })


    })
}

function contactInfo(objectOfUsefulThings, captcha) {
    //this function is to make the request to pass the query strings like token
    //and shipping info
    console.log('passing query strings for shipping info and captcha is needed')
    let {
        shopID
    } = objectOfUsefulThings
    let {
        checkoutURL
    } = objectOfUsefulThings
    let {
        method
    } = objectOfUsefulThings
    let {
        token
    } = objectOfUsefulThings
    let shippingURL = `https://shop-usa.palaceskateboards.com${checkoutURL}`
    console.log(typeof(captcha.token))
    let opts = {
        timeout: 5000,
        url: shippingURL,
        authority: 'shop-usa.palaceskateboards.com',
        method: 'post',
        path: checkoutURL,
        scheme: 'https',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        headers: {
            'accept-encoding': 'gzip,deflate,br',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'max-age=0',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
        },
        form: {
            _method: method,
            authenticity_token: token,
            previous_step: 'contact_information',
            step: 'shipping_method',
            'checkout[buyer_accepts_marketing]': '',
            'checkout[email]': config.email,
            'checkout[shipping_address][first_name]': config.firstName,
            'checkout[shipping_address][last_name]': config.lastName,
            'checkout[shipping_address][address1]': config.address1,
            'checkout[shipping_address][address2]': '',
            'checkout[shipping_address][city]': config.city,
            'checkout[shipping_address][country]': config.country,
            'checkout[shipping_address][province]': config.state,
            'checkout[shipping_address][zip]': config.zip,
            'checkout[shipping_address][phone]': config.phone,
            'checkout[remember_me]': 'false',
            'checkout[remember_me]': '0',
            'g-recaptcha-response': captcha.token,
            button: '',
            'checkout[client_details][browser_width]': '1440',
            'checkout[client_details][browser_height]': '251',
            'checkout[client_details][javascript_enabled]': '1',
            

        },
        followAllRedirects: true
    }
    console.log(shippingURL)
    return new Promise((resolve, reject) => {
        //#content > div > div.palace-checkout-body.clearfix > div.step > form > div.step__sections > div.section.section--shipping-method > div.section__content > div > div > div
        let dataForNextFunction = objectOfUsefulThings
        request(opts, (e, r, b) => {
            if (e) {
                console.log(e.code === 'ETIMEDOUT');
                console.log(e.connect === true);
                console.log('response code not 200 on contact info request')
                console.log(e)
                return reject(e)
            }
            if (r.statusCode == 200) {
                console.log('request for first step of shipping has been completed')
                let $ = cheerio.load(b)
                dataForNextFunction.currentStep = $('#previous_step').attr('value')
                dataForNextFunction.nextStep = $('#content > div > div.palace-checkout-body.clearfix > div.step > form > input[type=hidden]:nth-child(4)').val()
                dataForNextFunction.shippingValue = $('#content > div > div.palace-checkout-body.clearfix > div.step > form > div.step__sections > div.section.section--shipping-method > div.section__content > div > div > div').attr('data-shipping-method')
                //height and widith r not scraping
                console.log(dataForNextFunction.shippingValue , 'jfajsljflajslj')
                //going to pull like full price and log it
                let totalPrice = $('<input class="input-radio" data-checkout-total-shipping="$12.00" data-checkout-total-shipping-cents="1200" data-checkout-shipping-rate="$12.00" data-checkout-original-shipping-rate="$12.00" data-checkout-total-taxes="$0.00" data-checkout-total-taxes-cents="0" data-checkout-total-price="$127.00" data-checkout-total-price-cents="12700" data-checkout-payment-due="$127.00" data-checkout-payment-due-cents="12700" data-checkout-payment-subform="required" data-checkout-subtotal-price="$115.00" data-checkout-subtotal-price-cents="11500" data-backup="shopify-UPS%20Ground-12.00" aria-label="UPS Ground. $12.00" type="radio" value="shopify-UPS%20Ground-12.00" name="checkout[shipping_rate][id]" id="checkout_shipping_rate_id_shopify-ups20ground-12_00" checked="checked">').attr('data-checkout-subtotal-price')
                console.log(`the total price of the item you are checking out is ${totalPrice}`)
                dataForNextFunction.TotalWithCents = $('.payment-due__price').attr('data-checkout-payment-due-target')
                dataForNextFunction.shippingToken = $('#content > div > div.palace-checkout-body.clearfix > div.step > form > input[type=hidden]:nth-child(2)').attr('value')
                console.log(dataForNextFunction.shippingToken)
                
                resolve(dataForNextFunction)
            }



        })
    })
}
//shipping option page 
function secondStepOfShipping(secondShipFormData) {
    let {
        shopID
    } = secondShipFormData
    let {
        checkoutURL
    } = secondShipFormData
    let {
        method
    } = secondShipFormData
    let {
        token
    } = secondShipFormData
    let {
        currentStep
    } = secondShipFormData
    let {
        shippingValue
    } = secondShipFormData
    let {
        nextStep
    } = secondShipFormData
    let fullPriceWithCents = secondShipFormData.TotalWithCents
    let path = `${checkoutURL}?previous_step=contact_information&step=${currentStep}`
    let URL = `https://shop-usa.palaceskateboards.com${checkoutURL}`

    console.log(secondShipFormData)
    let opts = {
        url: URL,
        authority: 'shop-usa.palaceskateboards.com',
        method: 'post',
        path: path,
        scheme: 'https',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        headers: {
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en - US, en; q = 0.9',
            'cache-control': 'max - age=0',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
        },
        referer: `${websiteBaseURL}${checkoutURL}`,
        form: {
            _method: method,
            authenticity_token: token,
            previous_step: currentStep,
            step: nextStep,
            'checkout[shipping_rate][id]': shippingValue,
            'checkout[client_details][browser_width]': '1261',
            'checkout[client_details][browser_height]': '492',
            'checkout[client_details][javascript_enabled]': '1'
        },
        followAllRedirects: true
    }
    request(opts, (e, r, b) => {
        if (e) {
            console.log(e.code === 'ETIMEDOUT');
            console.log(e.connect === true);
            console.log('error sending request for ' + currentStep)
            console.log(e)
            return
        }
        if (r.statusCode == 200) {
            console.log('request has been made to continue to payment method')
            let $ = cheerio.load(b)
            let dataSelect = $('.radio-wrapper').attr('data-select-gateway')
            let checkoutToken = $('#content > div > div.palace-checkout-body.clearfix > div.step > div > form > input[type=hidden]:nth-child(2)').attr('value')
            submitPayment(secondShipFormData, dataSelect, fullPriceWithCents)
        }
    })
}

function submitPayment(newData, dataSelectNumber, fullPrice) {
    let {
        shopID
    } = newData
    let {
        checkoutURL
    } = newData
    let {
        method
    } = newData
    let {
        token
    } = newData
    let {
        currentStep
    } = newData
    let {
        shippingValue
    } = newData
    let previousStep = newData.nextStep
    console.log(newData)
    let checkoutURLSplit = checkoutURL.split('/')
    let identity = checkoutURLSplit[3]
    console.log(dataSelectNumber)
    console.log(fullPrice)
    console.log(previousStep)



    let Cc = {
        "credit_card": {
            "number": config.cardNumber,
            "name": config.nameOnCard,
            "month": config.month,
            "year": config.year,
            "verification_value": config.securityCode,
        },
    }
    console.log(identity)
    let opts = {
        method: 'post',
        url: 'https://elb.deposit.shopifycs.com/sessions',
        accept: "application/json",
        "content-type": "application/json",
        origin: 'https://checkout.shopifycs.com',
        referer: `https://checkout.shopifycs.com/number?identifier=${identity}&location=https%3A%2F%2F${websiteBaseURL}%2F${shopID}%2Fcheckouts%${identity}%3Fprevious_step%3Dshipping_method%26step%3Dpayment_method&dir=ltr`,
        "user-agent": "Mozilla / 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 75.0 .3770 .100 Safari / 537.36",
        json: true,
        body: Cc,


        followAllRedirects: true
    }
    request(opts, (e, r, b) => {
        if (e) {
            console.log(e.code === 'ETIMEDOUT');
            console.log(e.connect === true);
            console.log('error sending request for  stripe ID')
            console.log(e)
            return
        }
        if (r.statusCode == 200 || (b)) {
            console.log('Request has been made for Stripe ID')
            let stripeToken = b.id
            console.log(stripeToken)
            lastRequestToCheckout(stripeToken, dataSelectNumber, method, shopID, identity, token, previousStep, fullPrice)


        }
    })

}

function lastRequestToCheckout(stripe, dataSelect, method, shopID, identifier, token, payment_methodStep, fullPrice) {
    let opts = {
        url: `https://shop-usa.palaceskateboards.com/${shopID}/checkouts/${identifier}`,
        authority: websiteBaseURL,
        method: 'post',
        path: `/${shopID}/checkouts/${identifier}`,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        'accept-encoding': 'gzip,deflate,br',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://shop-usa.palaceskateboards.com',
        'upgrade-insecure-requests': '1',
        referer: `https://shop-usa.palaceskateboards.com/${shopID}/checkouts/${identifier}?previous_step=shipping_method&step=payment_method`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
        scheme: 'https',
        form: {
            _method: method,
            authenticity_token: token,
            previous_step: 'payment_method',
            step: '',
            s: stripe,
            'checkout[payment_gateway]': dataSelect,
            'checkout[credit_card][vault]': 'false',
            'checkout[different_billing_address]': 'false',
            'checkout[total_price]': fullPrice,
            number:config.cardNumber,
            name:config.nameOnCard,
            expiry: config.expiry,
            verification_value:config.securityCode,
            button: 'submit',
            complete: '1',
            'checkout[client_details][browser_width]': '1903',
            'checkout[client_details][browser_height]': '947',
            'checkout[client_details][javascript_enabled]': '1'
        },
        followAllRedirects: true
    }
    request(opts, (e, r, b) => {
        if (e) {
            console.log(e.code === 'ETIMEDOUT');
            console.log(e.connect === true);
            console.log('error sending request for  stripe ID')
            console.log(e)
            return
        }
        if (r.statusCode == 200 || (b)) {
            console.log(b)
            console.log(r.headers)
            //need to add a captccha request and post it b4 i post captcha 




        }
    })


}





//dont know if this format phone number function is needed
function formatPhoneNumber(phoneNumber) {
    if (phoneNumber.length == 10) {
        console.log('phone Number being formatted')
    } else {
        console.log('phone Number has to little or to many numbers')
        return
    }
    let first3 = phoneNumber.substring(0, 3)
    let middle3 = phoneNumber.substring(3, 6)
    let last4 = phoneNumber.substring(6, 11)
    phoneNumber = '(' + first3 + ')' + middle3 + '-' + last4
    console.log('Phone Number Formatted: ' + phoneNumber)
    return phoneNumber
}
