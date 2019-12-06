const categoryList = {
	electronics: [
		'/Best-Sellers-Electronics/zgbs/electronics/ref=zg_bs_nav_0',
		'/Best-Sellers/zgbs/amazon-devices/ref=zg_bs_nav_0',
		'/Best-Sellers/zgbs/wireless/ref=zg_bs_nav_e_1_e',
		'Best-Sellers-Handmade-Cell-Phone-Accessories/zgbs/handmade/14345426011/ref=zg_bs_nav_hnd_3_14345424011',
		'/Best-Sellers-Audio-Headphones/zgbs/wireless/172541/ref=zg_bs_nav_e_1_e',
		'/Best-Sellers-Electronics-Wearable-Technology/zgbs/electronics/10048700011/ref=zg_bs_nav_e_1_e',
		'/Best-Sellers-Electronics-Video-Game-Consoles-Accessories/zgbs/electronics/7926841011/ref=zg_bs_nav_e_1_e',
		'/Best-Sellers-Electronics-Cell-Phone-Cases-Holsters-Sleeves/zgbs/electronics/2407760011/ref=zg_bs_nav_1_wireless',
		'/Best-Sellers-Cell-Phone-Charging-Stations/zgbs/wireless/12557639011/ref=zg_bs_nav_3_2407761011',
		'/Best-Sellers-Electronics-Computer-Monitors/zgbs/electronics/1292115011/ref=zg_bs_nav_e_2_541966',
		'/Best-Sellers-Electronics-Laptop-Computers/zgbs/electronics/565108/ref=zg_bs_nav_pc_1_pc',
		'/Best-Sellers-Computers-Accessories-Computer-Keyboards/zgbs/pc/12879431/ref=zg_bs_nav_pc_4_11036491',
		'/Best-Sellers-Computers-Accessories-Computer-Mice/zgbs/pc/11036491/ref=zg_bs_nav_pc_3_11548956011',
		'/Best-Sellers-Electronics-Televisions/zgbs/electronics/172659/ref=zg_bs_nav_e_2_1266092011',
	],
	mens: [
		'/Best-Sellers-Mens-Fashion/zgbs/fashion/7147441011/ref=zg_bs_nav_1_fashion',
		'/Best-Sellers-Mens-Accessories/zgbs/fashion/2474937011/ref=zg_bs_nav_2_7147441011',
		'/Best-Sellers-Mens-Shoes/zgbs/fashion/679255011/ref=zg_bs_nav_2_7147441011',
		'/Best-Sellers-Mens-Watches/zgbs/fashion/6358539011/ref=zg_bs_nav_2_7147441011',
		'/Best-Sellers-Mens-Sunglasses-Eyewear-Accessories/zgbs/fashion/7072330011/ref=zg_bs_nav_3_2474937011',
	],
	womens: [
		'/Best-Sellers-Womens-Fashion/zgbs/fashion/7147440011/ref=zg_bs_nav_1_fashion',
		'/Best-Sellers-Womens-Accessories/zgbs/fashion/2474936011/ref=zg_bs_nav_2_7147440011',
		'/Best-Sellers-Womens-Sunglasses-Eyewear-Accessories/zgbs/fashion/7072321011/ref=zg_bs_nav_3_2474936011',
		'/Best-Sellers-Womens-Handbags-Purses-Wallets/zgbs/fashion/15743631/ref=zg_bs_nav_2_7147440011',
		'/Best-Sellers-Womens-Shoes/zgbs/fashion/679337011/ref=zg_bs_nav_2_7147440011',
		'/Best-Sellers-Womens-Jewelry/zgbs/fashion/7192394011/ref=zg_bs_nav_2_7147440011',
	],
	baby: [
		'/Best-Sellers-Home-Kitchen-Nursery-D%C3%A9cor/zgbs/home-garden/166875011/ref=zg_bs_nav_ba_2_695338011',
		'/Best-Sellers-Baby-Girls-Accessories/zgbs/fashion/2478435011/ref=zg_bs_nav_2_7147444011',
		'/Best-Sellers-Baby-Boys-Accessories/zgbs/fashion/2478436011/ref=zg_bs_nav_2_7147444011',
		'/Best-Sellers-Toys-Games-Baby-Toddler/zgbs/toys-and-games/196601011/ref=zg_bsnr_tab_t_bs',
		'/Best-Sellers-Toys-Games-Baby-Rattles-Plush-Rings/zgbs/toys-and-games/196612011/ref=zg_bsnr_tab_t_bs',
		'/Best-Sellers-Baby-Teether-Toys/zgbs/baby-products/166861011/ref=zg_bsnr_tab_t_bs'
	],
	homeware: [
		'/Best-Sellers-Home-Kitchen/zgbs/home-garden/ref=zg_bs_nav_0',
		'/Best-Sellers-Home-Kitchen-Décor-Products/zgbs/home-garden/1063278/ref=zg_bs_nav_hg_1_hg',
		'/Best-Sellers-Home-Kitchen-Clocks/zgbs/home-garden/542938/ref=zg_bs_nav_hg_2_1063278',
		'/Best-Sellers-Home-Kitchen-Furniture/zgbs/home-garden/1063306/ref=zg_bs_nav_hg_1_hg',
		'/Best-Sellers-Home-Kitchen-Office-Furniture/zgbs/home-garden/1063312/ref=zg_bs_nav_hg_2_1063306',
		'/Best-Sellers-Home-Kitchen-Coffee-Tea-Espresso/zgbs/home-garden/915194/ref=zg_bs_nav_hg_2_284507',
		'/Best-Sellers-Home-Kitchen-Wine-Accessories/zgbs/home-garden/13299291/ref=zg_bs_nav_hg_2_284507',
		'/Best-Sellers-Home-Kitchen-Bar-Tools-Drinkware/zgbs/home-garden/289728/ref=zg_bs_nav_hg_3_13162311',
		'/Best-Sellers-Kitchen-Dining-Beer-Mugs-Steins/zgbs/kitchen/13217761/ref=zg_bs_nav_k_3_289728',
		'/Best-Sellers-Handmade-Clocks/zgbs/handmade/11434561011/ref=zg_bs_nav_hnd_3_11434552011',
		'/Best-Sellers-Handmade-Artwork/zgbs/handmade/11433412011/ref=zg_bs_nav_hnd_2_11403478011'
	],
	sports: [
		'/Best-Sellers-Sports-Outdoors-Running-Equipment/zgbs/sporting-goods/3416071/ref=zg_bs_nav_sg_2_10971181011',
		'/Best-Sellers-Sports-Outdoors-Exercise-Fitness-Equipment/zgbs/sporting-goods/3407731/ref=zg_bs_nav_sg_2_10971181011',
		'/Best-Sellers-Sports-Outdoors-Snowboarding-Equipment/zgbs/sporting-goods/2342471011/ref=zg_bs_nav_sg_3_2204518011',
		'/Best-Sellers-Sports-Outdoors-Skateboarding-Equipment/zgbs/sporting-goods/3416111/ref=zg_bs_nav_sg_3_11051398011',
		'/Best-Sellers-Handmade-Skateboarding-Equipment/zgbs/handmade/14351420011/ref=zg_bs_nav_hnd_3_14351414011',
		'/Best-Sellers-Sports-Outdoors-Electronics-Gadgets/zgbs/sporting-goods/219367011/ref=zg_bs_nav_sg_3_3394801',
	],
	outdoor: [
		'/Best-Sellers-Sports-Outdoors-Hiking-Backpacks-Bags-Accessories/zgbs/sporting-goods/3400391/ref=zg_bs_nav_sg_3_3400371',
		'/Best-Sellers-Sports-Outdoors-Camping-Hiking-Equipment/zgbs/sporting-goods/3400371/ref=zg_bs_nav_sg_2_706814011',
		'/Best-Sellers-Sports-Outdoors-Outdoor-Recreation/zgbs/sporting-goods/706814011/ref=zg_bs_nav_sg_1_sg',
	],
	photography: [
		'/Best-Sellers-Electronics-Digital-Cameras/zgbs/electronics/281052/ref=zg_bs_nav_e_2_502394',
		'/Best-Sellers-Electronics-Camera-Bags-Cases/zgbs/electronics/172437/ref=zg_bs_nav_e_2_502394',
		'/Best-Sellers-Camera-Photo-Camcorders/zgbs/photo/172421/ref=zg_bs_nav_e_3_7161073011',
		'/Best-Sellers-Handmade-Camera-Photo-Accessories/zgbs/handmade/14345424011/ref=zg_bs_nav_hnd_2_11403474011'
	],
	toys: [
		'/Best-Sellers-Toys-Games-Action-Figures/zgbs/toys-and-games/2514571011/ref=zg_bs_nav_t_2_165993011',
	],
}

module.exports = categoryList
