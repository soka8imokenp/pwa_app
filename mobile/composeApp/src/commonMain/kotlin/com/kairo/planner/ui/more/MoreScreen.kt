package com.kairo.planner.ui.more

import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.BarChart
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.CloudSync
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.i18n.S
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.resources.Res
import com.kairo.planner.resources.mascot
import com.kairo.planner.ui.LocalAppState
import com.kairo.planner.ui.Page
import com.kairo.planner.ui.components.IconBubble
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoIconButton
import com.kairo.planner.ui.theme.Sumire
import org.jetbrains.compose.resources.painterResource
import org.koin.compose.koinInject

@Composable
fun MoreScreen(contentPadding: PaddingValues) {
    val app = LocalAppState.current
    val health = koinInject<HealthRepository>()
    val profile by remember { health.profile() }.collectAsState(HealthProfile())
    val s = S
    val c = Sumire.colors
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(contentPadding).padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(s.more, style = Sumire.type.hero(), color = c.ink)
        NeoCard(Modifier.fillMaxWidth(), color = c.matchaSoft, onClick = { app.open(Page.PROFILE) }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painterResource(Res.drawable.mascot), null, contentScale = ContentScale.Crop,
                    modifier = Modifier.size(56.dp).clip(CircleShape).border(2.dp, c.line, CircleShape),
                )
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(profile.name.ifBlank { s.appName }, style = Sumire.type.section(), color = c.ink)
                    Text(
                        if (profile.isComplete) "${profile.age} ${s.years} · ${profile.heightCm.toInt()} ${s.cm} · ${s.goalName(profile.goal)}"
                        else s.profileIncomplete,
                        style = Sumire.type.small(), color = c.inkMuted,
                    )
                }
                Icon(Icons.Rounded.ChevronRight, null, tint = c.ink)
            }
        }
        MenuGroup {
            MenuRow(Icons.Rounded.Inventory2, c.ochreSoft, s.backlog) { app.open(Page.BACKLOG) }
            MenuRow(Icons.Rounded.BarChart, c.indigoSoft, s.stats) { app.open(Page.STATS) }
            MenuRow(Icons.Rounded.Link, c.violetSoft, s.links) { app.open(Page.LINKS) }
            MenuRow(Icons.Rounded.History, c.sand, s.activityLog) { app.open(Page.ACTIVITY_LOG) }
        }
        MenuGroup {
            MenuRow(Icons.Rounded.Person, c.matchaSoft, s.healthProfile) { app.open(Page.PROFILE) }
            MenuRow(Icons.Rounded.Favorite, c.plumSoft, s.healthConnect) { app.open(Page.HEALTH_CONNECT) }
            MenuRow(Icons.Rounded.CloudSync, c.indigoSoft, s.account, s.accountHint) { app.open(Page.ACCOUNT) }
            MenuRow(Icons.Rounded.Settings, c.sand, s.settings) { app.open(Page.SETTINGS) }
            MenuRow(Icons.Rounded.Info, c.indigoSoft, s.about) { app.open(Page.ABOUT) }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun MenuGroup(content: @Composable ColumnScope.() -> Unit) {
    NeoCard(Modifier.fillMaxWidth(), contentPadding = PaddingValues(vertical = 6.dp), content = content)
}

@Composable
fun MenuRow(icon: ImageVector, bg: Color, title: String, subtitle: String? = null, trailing: (@Composable () -> Unit)? = null, onClick: (() -> Unit)? = null) {
    val c = Sumire.colors
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBubble(icon, bg, size = 36.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = Sumire.type.bodyStrong(), color = c.ink)
            if (subtitle != null) Text(subtitle, style = Sumire.type.small(), color = c.inkMuted)
        }
        if (trailing != null) trailing() else if (onClick != null) Icon(Icons.Rounded.ChevronRight, null, tint = c.inkMuted)
    }
}

@Composable
fun PageScaffold(title: String, onBack: () -> Unit, actions: @Composable () -> Unit = {}, content: @Composable ColumnScope.() -> Unit) {
    val c = Sumire.colors
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            NeoIconButton(Icons.Rounded.ArrowBack, S.back, onBack, size = 40.dp)
            Spacer(Modifier.width(12.dp))
            Text(title, style = Sumire.type.title(), color = c.ink, modifier = Modifier.weight(1f))
            actions()
        }
        Column(Modifier.weight(1f), content = content)
    }
}
