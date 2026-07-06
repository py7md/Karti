package com.dahshah.calculator.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room database Entity for local offline transaction sales.
 */
@Entity(tableName = "sales_history")
data class SaleRecordEntity(
    @PrimaryKey
    val id: String = "",
    val date: String? = null,
    val totalCards: Int = 0,
    val totalPrice: Double = 0.0,
    val paid: Boolean = false,
    val details: String? = null, // Stores serialized card details as JSON
    val serialNumber: String? = null,
    val networkName: String? = null
)
