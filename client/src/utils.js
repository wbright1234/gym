export const dateDiffInDays = (date1, date2) => {
	const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
	const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
	return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24)); // milliseconds for one day
}

export const getMonthName = (month) => {
	switch (month) {
		case 1:
			return 'January';
		case 2:
			return 'Febrauray';
		case 3:
			return 'March';
		case 4:
			return 'April';
		case 5:
			return 'May';
		case 6:
			return 'June';
		case 7:
			return 'July';
		case 8:
			return 'August';
		case 9:
			return 'September';
		case 10:
			return 'October';
		case 11:
			return 'November';
		case 12:
			return 'December';
		default:
			return null
	}
}

export const getDayName = (day) => {
	switch (day) {
		case 0:
			return 'Sun';
		case 1:
			return 'Mon';
		case 2:
			return 'Tue';
		case 3:
			return 'Wed';
		case 4:
			return 'Thu';
		case 5:
			return 'Fri';
		case 6:
			return 'Sat';
		default:
			return null;
	}
}

export const dataURLToFile = (dataurl, filename) => {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n) {
    u8arr[n - 1] = bstr.charCodeAt(n - 1)
    n -= 1 // to make eslint happy
  }
  return new File([u8arr], filename, { type: mime })
}
