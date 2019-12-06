const getListType = (path) => {
	const listType = {}

	switch (path) {
		case 'most-wished-for':
			listType.name = 'mostWishedFor'
			listType.ref = 'mw'
			break
		case 'new-releases':
			listType.name = 'newRelease'
			listType.ref = 'bsnr'
			break
		case 'most-gifted':
			listType.name = 'mostGifted'
			listType.ref = 'mg'
			break
		default:
			listType.name = 'bestSeller'
			listType.ref = 'bs'
	}

	return listType
}

module.exports = getListType
