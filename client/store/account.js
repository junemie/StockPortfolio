import axios from 'axios'
import {key} from '../../secrets'

const GET_PORTFOLIO = 'GET PORTFOLIO'
const CHECK_SYMBOL = 'CHECK_SYMBOL'
const BUY_STOCK = 'BUY_STOCK'

const defaultAccount = {
  portfolio: [],
  isSymbol: false,
  newBalance: 0
}

const getPortfolio = response => ({
  type: GET_PORTFOLIO,
  portfolio: response
})

const checkSymbol = symbol => ({type: CHECK_SYMBOL, symbol})
const buyStock = newBalance => ({type: BUY_STOCK, newBalance})

export const gotPortfolio = userId => async dispatch => {
  try {
    const {data} = await axios.get(`/api/account/${userId}`)
    console.log('THIS IS THE DATEEEEEAAA', data[0])

    if (data[0]) {
      const symbolStr = data.map(stock => stock.ticker).toString()
      //TODO: CHANGE SANDBOX TO PUBLISH WEB
      // const stockPrices = await axios.get(
      //   `https://sandbox.iexapis.com/v1/stock/market/batch?symbols=${symbolStr}&types=price&token=${key}`
      // )
      const stockPrices = await axios.get(
        `https://sandbox.iexapis.com/v1/stock/market/batch?symbols=${symbolStr}&types=price,ohlc&token=${key}`
      )

      let stockPriceObj = Object.entries(stockPrices.data)
      let formattedObj = {}

      for (const [stockName, value] of stockPriceObj) {
        formattedObj[stockName] = {
          // price: formatPrice(value.price),
          price: Math.round((value.price + Number.EPSILON) * 100) / 100,
          open: value.ohlc.open ? value.ohlc.open.price : value.price
        }
      }

      data.forEach(stock => {
        if (formattedObj[stock.ticker]) {
          console.log(stock)
          let num = formattedObj[stock.ticker].price * stock.quantity
          stock.shareCost = num.toFixed(2)
          stock.sharePrice = formattedObj[stock.ticker].price.toFixed(2)
          stock.openPrice = formattedObj[stock.ticker].open.toFixed(2)
        }
      })
    }
    dispatch(getPortfolio(data))
  } catch (err) {
    console.log(err)
  }
}

export const checkedSymbols = searchSymbol => async dispatch => {
  try {
    //TODO: CHANGE THE SANDBOX TO CLOUD API -> https://cloud.iexapis.com/
    const {data} = await axios.get(
      `https://sandbox.iexapis.com/stable/search/${searchSymbol}?filter=symbol&token=${key}`
    )
    let response = !!data.length
    console.log(response)
    dispatch(checkSymbol(response))
  } catch (err) {
    console.log(err)
  }
}

export const boughtStock = (symbol, qty, userId, balance) => async dispatch => {
  try {
    //TODO:
    //CHANGE THE SANDBOX TO CLOUD API -> https://cloud.iexapis.com/
    const {data} = await axios.get(
      `https://sandbox.iexapis.com/stable/stock/${symbol}/price?token=${key}`
    )

    if (data) {
      let price = data.toFixed(2)
      let shareCost = price * qty
      if (shareCost > balance) {
        return 'Share cost is greater than your current balance!'
      } else {
        let updatedBalance = (balance - shareCost).toFixed(2)
        const response = await axios.post(`/api/account/${userId}`, {
          symbol,
          qty,
          updatedBalance,
          price
        })
        return dispatch(buyStock(response.data))
      }
    }
  } catch (error) {
    console.error(error)
  }
}

export default function(state = defaultAccount, action) {
  switch (action.type) {
    case GET_PORTFOLIO:
      return {...state, portfolio: [...action.portfolio]}
    case CHECK_SYMBOL:
      return {...state, isSymbol: action.symbol}
    case BUY_STOCK:
      return {...state, newBalance: action.newBalance}
    default:
      return state
  }
}
