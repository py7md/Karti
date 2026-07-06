package com.dahshah.calculator.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room database Entity for local offline shops and grocery store statements.
 */
@Entity(tableName = "shops")
data class ShopEntity(
    @PrimaryKey
    val id: String = "",
    val name: String? = null,
    val phone: String? = null,
    val balance: Double = 0.0,
    val serialNumber: String? = null // Linked serial activation ID
)
