package com.dahshah.calculator.data

import androidx.room.*

@Dao
interface AppDao {
    
    // --- Sales Queries ---
    @Query("SELECT * FROM sales_history WHERE serialNumber = :serial ORDER BY date DESC")
    fun getSalesForSerial(serial: String): List<SaleRecordEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertSale(sale: SaleRecordEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertSales(sales: List<SaleRecordEntity>)

    @Query("DELETE FROM sales_history WHERE id = :saleId")
    fun deleteSaleById(saleId: String)

    @Query("DELETE FROM sales_history WHERE serialNumber = :serial")
    fun clearSalesForSerial(serial: String)

    // --- Shops Queries ---
    @Query("SELECT * FROM shops WHERE serialNumber = :serial ORDER BY name ASC")
    fun getShopsForSerial(serial: String): List<ShopEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertShop(shop: ShopEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertShops(shops: List<ShopEntity>)

    @Query("DELETE FROM shops WHERE id = :shopId")
    fun deleteShopById(shopId: String)

    @Query("DELETE FROM shops WHERE serialNumber = :serial")
    fun clearShopsForSerial(serial: String)
}
